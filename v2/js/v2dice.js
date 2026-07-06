// ─── Death Dice V2 — Dice & Countdown (DOM/GSAP) ─────────────────────────────
// Ported from V1's battle-tested overlay: GPU transforms only, screen-space
// squash (identical every roll), hard face-lock on landing, 3.4s failsafe so a
// hidden tab can never wedge the game.

const V2Dice = (() => {

  const FACE_ROT = {
    1: { rx: 0, ry: 0 }, 2: { rx: 0, ry: -90 }, 3: { rx: 90, ry: 0 },
    4: { rx: -90, ry: 0 }, 5: { rx: 0, ry: 90 }, 6: { rx: 0, ry: 180 },
  };
  const PIPS = {
    1: [[50, 50]],
    2: [[30, 28], [70, 72]],
    3: [[30, 22], [50, 50], [70, 78]],
    4: [[27, 27], [73, 27], [27, 73], [73, 73]],
    5: [[27, 27], [73, 27], [50, 50], [27, 73], [73, 73]],
    6: [[27, 20], [73, 20], [27, 50], [73, 50], [27, 80], [73, 80]],
  };

  // ── Big center-stage roll ────────────────────────────────────────────────────
  // info: { name, roll, note } — readout under the die
  function roll(result, info, onDone) {
    let doneFired = false;
    const done = () => { if (!doneFired) { doneFired = true; onDone?.(); } };

    try {
      const SIZE = 200;
      const cx = innerWidth / 2, cy = innerHeight * 0.38;

      const overlay = document.createElement('div');
      overlay.id = 'dice-3d-overlay';
      document.body.appendChild(overlay);

      // FAILSAFE — rAF pauses in hidden tabs; never let the overlay stick
      setTimeout(() => { if (!doneFired) { try { overlay.remove(); } catch (_) {} done(); } }, 3400);

      const spot = document.createElement('div');
      spot.className = 'dice-3d-spotlight';
      spot.style.cssText = `background: radial-gradient(ellipse 210px 230px at ${cx}px ${cy}px,
        transparent 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.94) 72%); opacity:0;`;
      overlay.appendChild(spot);

      const scene = document.createElement('div');
      scene.className = 'dice-3d-scene';
      scene.style.left = `${cx - SIZE / 2}px`;
      scene.style.top = `${cy - SIZE / 2}px`;
      overlay.appendChild(scene);

      const cube = document.createElement('div');
      cube.className = 'dice-3d-cube';
      scene.appendChild(cube);

      for (let f = 1; f <= 6; f++) {
        const face = document.createElement('div');
        face.className = `dice-3d-face f${f}`;
        (PIPS[f] ?? []).forEach(([lp, tp]) => {
          const pip = document.createElement('div');
          pip.className = 'dice-3d-pip';
          pip.style.cssText = `left:${lp}%;top:${tp}%;`;
          face.appendChild(pip);
        });
        cube.appendChild(face);
      }

      const lbl = document.createElement('div');
      lbl.className = 'dice-3d-label';
      lbl.innerHTML = `
        <div class="dr-name">${info?.name ?? ''} ROLLED</div>
        <div class="dr-mana">${result}</div>
        ${info?.note ? `<div class="dr-dmg">${info.note}</div>` : ''}`;
      lbl.style.left = `${cx}px`;
      lbl.style.top = `${cy + SIZE * 0.72}px`;
      overlay.appendChild(lbl);
      gsap.set(lbl, { xPercent: -50 });

      const tgt = FACE_ROT[result] ?? { rx: 0, ry: 0 };
      const spinX = (3 + Math.floor(Math.random() * 3)) * 360;
      const spinY = (3 + Math.floor(Math.random() * 3)) * 360;
      const spinZ = (Math.random() > 0.5 ? 1 : -1) * (1 + Math.floor(Math.random() * 2)) * 360;
      const drift = (Math.random() - 0.5) * 80;

      gsap.set(scene, { x: drift, y: -(cy + SIZE) });
      gsap.to(spot, { opacity: 1, duration: 0.42, ease: 'power2.out' });
      gsap.to(scene, { y: 0, duration: 0.62, ease: 'bounce.out' });
      gsap.to(scene, { x: 0, duration: 0.46, delay: 0.18, ease: 'back.out(2.2)' });

      gsap.to(cube, {
        rotationX: tgt.rx + spinX, rotationY: tgt.ry + spinY, rotationZ: spinZ,
        duration: 0.90, ease: 'power4.out',
        onComplete: () => {
          gsap.set(cube, { rotationX: tgt.rx, rotationY: tgt.ry, rotationZ: 0 }); // face lock
          V2FX?.sfx?.('land');
          if (result === 6) V2FX?.sfx?.('six');
          gsap.to(scene, { scaleX: 1.22, scaleY: 0.78, duration: 0.08, ease: 'power2.in',
            onComplete: () => gsap.to(scene, { scaleX: 1, scaleY: 1, duration: 0.5, ease: 'back.out(4)' }) });
          if (result === 6) gsap.to(scene, { scale: 1.12, duration: 0.1, yoyo: true, repeat: 5, delay: 0.15 });
          gsap.fromTo(lbl, { opacity: 0, scale: 0.3, y: 18 },
            { opacity: 1, scale: 1, y: 0, duration: 0.34, delay: 0.1, ease: 'back.out(2.2)' });
        },
      });

      setTimeout(() => {
        gsap.to(lbl, { opacity: 0, duration: 0.24 });
        gsap.to(scene, { opacity: 0, scale: 0.5, duration: 0.3, ease: 'power2.in' });
        gsap.to(spot, { opacity: 0, duration: 0.3,
          onComplete: () => { overlay.remove(); done(); } });
      }, 1900);

    } catch (e) {
      console.error('[V2Dice]', e);
      done();
    }
  }

  // Quick mini-roll (chained rerolls) — smaller, faster, no spotlight
  function quickRoll(result, onDone) {
    roll(result, { name: 'REWIND', roll: result }, onDone);
  }

  // ── Countdown ("NAME ROLLS IN 3…") ──────────────────────────────────────────
  function showCountdown(name, n) {
    let el = document.getElementById('roll-countdown');
    if (!el) {
      el = document.createElement('div');
      el.id = 'roll-countdown';
      el.innerHTML = '<div class="rc-name"></div><div class="rc-num"></div><div class="rc-hint">ROLL NOW to skip · CALL IT to gamble</div>';
      document.body.appendChild(el);
    }
    el.querySelector('.rc-name').textContent = `${name.toUpperCase()} ROLLS IN`;
    const num = el.querySelector('.rc-num');
    num.textContent = n;
    el.classList.add('visible');
    num.classList.remove('tick');
    void num.offsetWidth;
    num.classList.add('tick');
  }

  function hideCountdown() {
    document.getElementById('roll-countdown')?.classList.remove('visible');
  }

  return { roll, quickRoll, showCountdown, hideCountdown };
})();
