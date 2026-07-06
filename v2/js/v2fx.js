// ─── Death Dice V2 — FX Engine ────────────────────────────────────────────────
// Sound (WebAudio synth — zero asset files), particles (single canvas),
// event banners (big, sequential — ONE thing at a time), screen shake, music.
// Everything is guarded: if audio is unavailable, the game plays silently.

const V2FX = (() => {

  let ctx = null;          // AudioContext — created on first user gesture
  let master = null;
  let musicNodes = null;
  let muted = false;

  // ── Init (must be called from a click handler for autoplay policy) ─────────
  function init() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);
      _initParticles();
    } catch (e) { console.warn('[V2FX] no audio', e); }
  }

  function setMuted(m) {
    muted = m;
    if (master) master.gain.value = m ? 0 : 0.55;
  }
  function isMuted() { return muted; }

  // ── Synth helpers ───────────────────────────────────────────────────────────
  function _osc(type, freq, t0, dur, vol = 0.3, glideTo = null) {
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (glideTo != null) o.frequency.exponentialRampToValueAtTime(Math.max(20, glideTo), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  function _noise(t0, dur, vol = 0.3, filterFreq = 1000, type = 'lowpass') {
    if (!ctx) return;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0);
  }

  // ── SFX bank ────────────────────────────────────────────────────────────────
  const SFX = {
    click:   (t) => { _osc('square', 800, t, 0.05, 0.12); },
    draw:    (t) => { _noise(t, 0.12, 0.15, 3200, 'highpass'); },
    rig:     (t) => { _osc('square', 190, t, 0.07, 0.22); _osc('square', 140, t + 0.08, 0.09, 0.2); },
    roll:    (t) => { for (let i = 0; i < 6; i++) _noise(t + i * 0.09, 0.07, 0.12, 900 + Math.random() * 900); },
    land:    (t) => { _osc('sine', 95, t, 0.2, 0.5, 45); _noise(t, 0.08, 0.25, 500); },
    six:     (t) => { _osc('triangle', 880, t, 0.14, 0.3); _osc('triangle', 1320, t + 0.12, 0.28, 0.3); },
    hit:     (t) => { _osc('sawtooth', 170, t, 0.16, 0.4, 60); _noise(t, 0.14, 0.3, 700); },
    bighit:  (t) => { _osc('sawtooth', 220, t, 0.3, 0.5, 40); _osc('sine', 55, t, 0.35, 0.6); _noise(t, 0.25, 0.4, 400); },
    heal:    (t) => { [523, 659, 784].forEach((f, i) => _osc('triangle', f, t + i * 0.07, 0.18, 0.2)); },
    coin:    (t) => { _osc('sine', 1568, t, 0.09, 0.25); _osc('sine', 2093, t + 0.08, 0.14, 0.25); },
    execute: (t) => { _osc('sawtooth', 420, t, 0.45, 0.5, 55); _osc('sine', 50, t + 0.05, 0.45, 0.6); _noise(t, 0.4, 0.4, 300); },
    fizzle:  (t) => { _osc('sine', 1200, t, 0.32, 0.25, 280); _noise(t + 0.05, 0.3, 0.18, 2000, 'highpass'); },
    reaper:  (t) => { _osc('sine', 110, t, 0.7, 0.35); _osc('sine', 116, t, 0.7, 0.3); _osc('sine', 55, t + 0.1, 0.6, 0.4); },
    death:   (t) => { _osc('sawtooth', 300, t, 0.75, 0.45, 38); _noise(t + 0.1, 0.5, 0.35, 250); },
    chaos:   (t) => { for (let i = 0; i < 5; i++) _osc('sine', 300 + Math.random() * 900, t + i * 0.07, 0.1, 0.2); },
    win:     (t) => { [523, 659, 784, 1047].forEach((f, i) => _osc('triangle', f, t + i * 0.12, 0.4, 0.3)); },
  };

  function sfx(name) {
    if (!ctx || muted) return;
    try {
      if (ctx.state === 'suspended') ctx.resume();
      SFX[name]?.(ctx.currentTime + 0.01);
    } catch (_) {}
  }

  // ── Music: low tension drone + heartbeat, subtle by design ─────────────────
  function musicStart() {
    if (!ctx || musicNodes) return;
    try {
      const g = ctx.createGain(); g.gain.value = 0.055; g.connect(master);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260; f.connect(g);
      const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 55;   // A1
      const o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = 82.7; // E2
      o2.detune.value = 6;
      o1.connect(f); o2.connect(f);
      // slow filter breathing
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
      const lfoG = ctx.createGain(); lfoG.gain.value = 120;
      lfo.connect(lfoG); lfoG.connect(f.frequency);
      o1.start(); o2.start(); lfo.start();
      // heartbeat
      const beat = setInterval(() => {
        if (muted || !ctx) return;
        const t = ctx.currentTime;
        _osc('sine', 58, t, 0.14, 0.10, 40);
        _osc('sine', 58, t + 0.22, 0.12, 0.07, 40);
      }, 2400);
      musicNodes = { o1, o2, lfo, g, beat };
    } catch (_) {}
  }

  function musicStop() {
    if (!musicNodes) return;
    try {
      clearInterval(musicNodes.beat);
      [musicNodes.o1, musicNodes.o2, musicNodes.lfo].forEach(o => o.stop());
      musicNodes.g.disconnect();
    } catch (_) {}
    musicNodes = null;
  }

  // ── Particles — one fullscreen canvas, rAF only while alive ────────────────
  let _pc = null, _pctx = null, _parts = [], _pRunning = false;

  function _initParticles() {
    if (_pc) return;
    _pc = document.createElement('canvas');
    _pc.id = 'fx-canvas';
    _pc.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9800;';
    document.body.appendChild(_pc);
    const fit = () => { _pc.width = innerWidth; _pc.height = innerHeight; };
    fit(); addEventListener('resize', fit);
    _pctx = _pc.getContext('2d');
  }

  const P_STYLES = {
    ember:  { cols: ['#ff7722', '#ffaa33', '#ff4411', '#ffdd66'], g: 0.12, size: 4, spd: 7 },
    blood:  { cols: ['#ff3322', '#cc1111', '#881111'],            g: 0.3,  size: 4, spd: 6 },
    heal:   { cols: ['#33ee77', '#88ffb0', '#22bb55'],            g: -0.06, size: 3.4, spd: 3.4 },
    gold:   { cols: ['#ffd24a', '#ffec9a', '#d4af37'],            g: 0.22, size: 4.5, spd: 8 },
    dark:   { cols: ['#9b59ff', '#552288', '#221133', '#ddddff'], g: 0.05, size: 5, spd: 6 },
    frost:  { cols: ['#7fd0ff', '#bfeaff', '#4499cc'],            g: 0.04, size: 3.6, spd: 4 },
    confetti:{ cols: ['#ff4433','#ffd24a','#33dd77','#33bbff','#ff66aa'], g: 0.1, size: 5, spd: 9 },
  };

  function particles(type, x, y, count = 26) {
    if (!_pctx) _initParticles();
    if (!_pctx) return;
    const st = P_STYLES[type] ?? P_STYLES.ember;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = (0.3 + Math.random() * 0.7) * st.spd;
      _parts.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - st.spd * 0.35,
        life: 1, decay: 0.016 + Math.random() * 0.02,
        col: st.cols[Math.floor(Math.random() * st.cols.length)],
        size: st.size * (0.5 + Math.random() * 0.8), g: st.g,
      });
    }
    if (!_pRunning) { _pRunning = true; requestAnimationFrame(_tick); }
  }

  function particlesAt(el, type, count) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    particles(type, r.left + r.width / 2, r.top + r.height / 2, count);
  }

  function _tick() {
    if (!_pctx) { _pRunning = false; return; }
    _pctx.clearRect(0, 0, _pc.width, _pc.height);
    _parts = _parts.filter(p => {
      p.x += p.vx; p.y += p.vy; p.vy += p.g; p.life -= p.decay;
      if (p.life <= 0) return false;
      _pctx.globalAlpha = Math.max(0, p.life);
      _pctx.fillStyle = p.col;
      _pctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size * p.life, p.size * p.life);
      return true;
    });
    _pctx.globalAlpha = 1;
    if (_parts.length) requestAnimationFrame(_tick);
    else { _pRunning = false; _pctx.clearRect(0, 0, _pc.width, _pc.height); }
  }

  // ── Event banners — ONE at a time, so players can follow the story ─────────
  const _bq = [];
  let _bannerBusy = false;

  function banner(text, cls = '', soundName = null, particleSpec = null) {
    _bq.push({ text, cls, soundName, particleSpec });
    if (!_bannerBusy) _nextBanner();
  }

  function _nextBanner() {
    const b = _bq.shift();
    if (!b) { _bannerBusy = false; return; }
    _bannerBusy = true;

    if (b.soundName) sfx(b.soundName);
    if (b.particleSpec) {
      const { type, el, x, y, count } = b.particleSpec;
      if (el) particlesAt(el, type, count);
      else particles(type, x ?? innerWidth / 2, y ?? innerHeight * 0.42, count);
    }

    const el = document.createElement('div');
    el.className = `fx-banner ${b.cls}`;
    el.textContent = b.text;
    document.body.appendChild(el);
    gsap.fromTo(el, { scale: 2.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.22, ease: 'power3.in' });
    gsap.to(el, { opacity: 0, y: -26, duration: 0.3, delay: 0.95,
      onComplete: () => { el.remove(); _nextBanner(); } });
    // hidden-tab failsafe
    setTimeout(() => { if (document.body.contains(el)) { el.remove(); _nextBanner(); } }, 2200);
  }

  // ── Screen shake ────────────────────────────────────────────────────────────
  function shake(mag = 8) {
    const el = document.getElementById('screen-game');
    if (!el) return;
    gsap.fromTo(el, { x: -mag }, { x: mag, duration: 0.05, yoyo: true, repeat: 5,
      onComplete: () => gsap.set(el, { x: 0 }) });
  }

  return { init, sfx, banner, particles, particlesAt, shake,
           musicStart, musicStop, setMuted, isMuted };
})();
