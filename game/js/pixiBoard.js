// ─── PixiBoard — WebGL-accelerated game board ─────────────────────────────────
// Handles ALL visual game board rendering via PixiJS v7.
// Game logic stays in gameState.js / phaseManager.js / etc.

const PixiBoard = (() => {

  // ── Asset paths ──────────────────────────────────────────────────────────────
  const HERO_DIR   = 'assets/cards/DD%20Character%20V7/';
  const ACTION_DIR = 'assets/cards/Action%20Card%20Test%20Export/';
  const ACTION_DEF = 'Action%20Card.jpg';

  // Encode spaces in filenames so browser fetches succeed
  const _encAsset = (s) => s ? s.replace(/ /g, '%20') : s;

  // Text factory — sets .resolution on every PIXI.Text so text is crisp at 2.5× zoom
  // (resolution must be set on the object, NOT inside TextStyle, in PixiJS v7)
  // Capped at 3: still crisp at the 2.5× hover zoom but ~halves text-texture cost vs the
  // old cap of 5 on HiDPI displays (a major source of GPU memory + upload lag).
  const TXT_RES = Math.min(Math.ceil((window.devicePixelRatio || 1) * 2), 3);
  const _PixiText = PIXI.Text;
  const _T = (str, style) => { const t = new _PixiText(str, style); t.resolution = TXT_RES; return t; };

  // ── Card dimensions ──────────────────────────────────────────────────────────
  const HC_BASE = { w: 150, h: 214 }; // hero hand card, readable laptop baseline
  const AC_BASE = { w: 130, h: 185 }; // action hand card, same card ratio
  const CC_BASE = { w: 158, h: 219 }; // board character card
  const HC = { ...HC_BASE };
  const AC = { ...AC_BASE };
  const CC = { ...CC_BASE };
  const CB = { w: 68,  h: 96  }; // opponent card back

  // ── Colour palette — Death Dice (dark demonic) ───────────────────────────────
  const P = {
    bg:      0x030106,   // near-black
    card:    0x0c0610,   // dark card face
    own:     0xcc2200,   // blood crimson (active player)
    opp:     0x660088,   // death purple  (opponent)
    accent:  0xff3300,   // ember red
    mana:    0xcc3300,   // hellfire
    gold:    0xd4af37,   // bone gold
    green:   0x1a5c28,   // dark forest
    red:     0xff2222,   // bright blood
    warn:    0xff6600,   // ember orange
    text:    0xf0e0d0,   // warm bone white
    dim:     0x7a6655,   // muted ash
  };

  // ── Texture cache — avoid re-fetching the same image on every render ─────────
  const _texCache = new Map();

  // ── Internal state ───────────────────────────────────────────────────────────
  let _app  = null;
  let _L    = {};     // named layers (PIXI.Container)
  let _hud  = {};     // HUD element references
  let _drag = null;   // { ct, offX, offY, isChar }
  let _hand  = { p1: [], p2: [] };
  let _board = { p1: [], p2: [] };
  let _cbs  = {};     // callbacks from main.js
  let _lastFlippedTurn = null; // track when to animate the turn flip
  let _playerIcons = {};       // { p1: Container, p2: Container }
  let _hoveredCard = null;     // card currently raised to fx layer via _hover
  let _bgBuiltSize    = { w: 0, h: 0 }; // cache: skip bg rebuild if size unchanged
  let _zonesBuiltSize = { w: 0, h: 0 }; // cache: skip zone rebuild if size unchanged
  let _iconsBuiltTurn = null;            // cache: skip icon rebuild if active player unchanged
  const _prevHandCards = { p1: new Map(), p2: new Map() }; // cacheKey → Container
  let _handHoverCount  = 0;   // pointer-entered count across all hand cards
  let _handCollapseTimer = null;
  let _targetMode = null;       // { ownerId, mode, filter, onPick } — click-to-target
  let _targetHighlights = [];   // pulsing rings added to valid targets

  // ── Dimensions helpers ───────────────────────────────────────────────────────
  const W = () => _app?.screen.width  ?? 1280;
  const H = () => _app?.screen.height ?? 800;
  const _clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  function _layoutScale() {
    const width = W();
    const height = H();
    if (width <= 520) return _clamp(width / 440, 0.74, 0.88);
    if (width <= 760) return _clamp(Math.min(width / 720, height / 760), 0.78, 0.94);
    if (height <= 680) return 0.86;
    if (width >= 1600 && height >= 900) return 1.12;
    return 1;
  }

  function _syncLayoutMetrics() {
    const s = _layoutScale();
    HC.w = Math.round(HC_BASE.w * s);
    HC.h = Math.round(HC_BASE.h * s);
    AC.w = Math.round(AC_BASE.w * s);
    AC.h = Math.round(AC_BASE.h * s);
    CC.w = Math.round(CC_BASE.w * s);
    CC.h = Math.round(CC_BASE.h * s);
  }

  const ACTIVE_BAR_H = 54;
  const RIGHT_RAIL_W = () => _isNarrow() ? 0 : 190;

  function _bottomHudClearance() {
    return (H() <= 680 ? 72 : 84);
  }

  function _isCompact() {
    return W() <= 760 || H() <= 680;
  }

  function _isNarrow() {
    return W() <= 760;
  }

  function _isShortWide() {
    return W() > 760 && H() <= 680;
  }

  function _rightLaneCenterX() {
    const zoneRight = W() / 2 + ZONE.w() / 2;
    return _clamp((zoneRight + W() - SAFE) / 2, zoneRight + 54, W() - 70);
  }

  function _handBaseY() {
    const bottomLimit = H() - HC.h - _bottomHudClearance();
    const zoneY = ZONE.p1Y() + ZONE.hOwn() + 10;
    return Math.max(SAFE + 80, Math.min(zoneY, bottomLimit));
  }

  function _handHoverScale(cardHeight) {
    const usableHeight = H() - _bottomHudClearance() - SAFE;
    const target = (usableHeight / Math.max(1, cardHeight)) * 0.82;
    return _clamp(target, 1.45, _isCompact() ? 1.9 : 2.1);
  }

  // Safe inset — keeps every HUD element away from screen edges (TVs/odd windows
  // crop the outermost pixels, and edge-hugging UI reads as clutter).
  const SAFE = 18;

  // Shared HUD anchor points
  const HUD_DIE      = () => ({
    x: _isNarrow() ? W() - 62 : _rightLaneCenterX(),
    y: _isNarrow() ? H() * 0.30 : ZONE.p2Y() + ZONE.hOpp() / 2,
  });      // LAST ROLL die
  const HUD_CENTER_Y = () => (ZONE.p2Y() + ZONE.hOpp() + ZONE.p1Y()) / 2; // mana strip

  // ════════════════════════════════════════════════════════════════════════════
  // INIT
  // ════════════════════════════════════════════════════════════════════════════
  function init(container, callbacks) {
    if (typeof PIXI === 'undefined') {
      console.error('[PixiBoard] PIXI.js is not loaded');
      return;
    }
    _cbs = callbacks || {};

    // Guard against double-init (returning to the menu and starting a new game).
    // Creating a second PIXI.Application stacks WebGL contexts + tickers and leaks
    // hard — browsers cap live contexts (~16) and the extra tickers compound lag.
    // Reuse the existing app and just re-render the fresh game state instead.
    if (_app) { render(); return; }

    _app = new PIXI.Application({
      resizeTo:        container,
      backgroundColor: P.bg,
      antialias:       true,
      // Cap at 2: HiDPI displays sometimes report DPR 2.5–3, which renders 6–9× the
      // pixels and tanks the framerate. 2 is visually indistinguishable here.
      resolution:      Math.min(window.devicePixelRatio || 1, 2),
      autoDensity:     true,
    });
    container.appendChild(_app.view);
    _syncLayoutMetrics();

    // Build layer stack (painter's order: bg → zones → oppHand → cards → hand → hud → fx → effects → drag)
    // oppHand: opponent face-down cards, sits BELOW cards so deployed chars always render on top
    // 'effects' is never wiped on render — used for hit flashes that outlive a render call
    for (const name of ['bg', 'zones', 'oppHand', 'cards', 'hand', 'hud', 'fx', 'effects', 'drag']) {
      _L[name] = new PIXI.Container();
      _app.stage.addChild(_L[name]);
    }

    _buildBg();
    _buildZones();
    _buildHUD();

    // Global pointer tracking for drag-and-drop + click-to-target
    _app.stage.interactive = true;
    _app.stage.hitArea = new PIXI.Rectangle(0, 0, 99999, 99999);
    _app.stage.on('pointermove',      _onGlobalMove);
    _app.stage.on('pointerup',        _onGlobalUp);
    _app.stage.on('pointerupoutside', _onGlobalUp);
    _app.stage.on('pointerdown',      _onStagePointerDown);
    window.addEventListener('pointerup', () => {
      if (_drag) setTimeout(() => { if (_drag) _cancelDrag(); }, 0);
    });
    window.addEventListener('pointercancel', _cancelDrag);
    window.addEventListener('blur', _cancelDrag);

    // Right-click = discard-for-mana on hand cards; suppress browser menu
    _app.view.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('resize', () => {
      requestAnimationFrame(() => {
        // Invalidate all size-dependent caches
        _syncLayoutMetrics();
        _zonesBuiltSize = { w: 0, h: 0 };
        _iconsBuiltTurn = null;
        _L.hud.removeChildren();
        _hud = {};
        _buildHUD();
        render();
      });
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // BACKGROUND
  // ════════════════════════════════════════════════════════════════════════════
  function _buildBg() {
    if (_bgBuiltSize.w === W() && _bgBuiltSize.h === H()) return;
    _bgBuiltSize = { w: W(), h: H() };
    _L.bg.cacheAsBitmap = false; // release old cached texture before mutating children
    _L.bg.removeChildren();
    const g = new PIXI.Graphics();

    // Base — near-black void
    g.beginFill(P.bg);
    g.drawRect(0, 0, W(), H());
    g.endFill();

    // Hellfire glow from center
    for (let r = 500; r >= 30; r -= 32) {
      g.beginFill(0x2a0000, ((500 - r) / 500) * 0.07);
      g.drawEllipse(W() * 0.5, H() * 0.5, r * 1.7, r * 0.8);
      g.endFill();
    }
    // Player ember (bottom)
    for (let r = 260; r >= 20; r -= 22) {
      g.beginFill(0x400000, ((260 - r) / 260) * 0.11);
      g.drawEllipse(W() * 0.5, H() * 0.83, r * 2.4, r * 0.65);
      g.endFill();
    }
    // Opponent death glow (top)
    for (let r = 260; r >= 20; r -= 22) {
      g.beginFill(0x1e0028, ((260 - r) / 260) * 0.10);
      g.drawEllipse(W() * 0.5, H() * 0.17, r * 2.4, r * 0.65);
      g.endFill();
    }

    _hexGrid(g);

    // Blood-red lane crack. Keep it inside the board bounds so it does not
    // read as a broken border or run into the action rail.
    const crackPad = _isNarrow() ? 8 : 2;
    const crackLeft = W() / 2 - ZONE.w() / 2 + crackPad;
    const crackRight = W() / 2 + ZONE.w() / 2 - crackPad;
    const crackY = _isNarrow()
      ? H() * 0.5
      : Math.min(H() * 0.5, ZONE.p1Y() + ZONE.hOwn() * 0.28);
    g.lineStyle(1, 0x440000, 0.65);
    g.moveTo(crackLeft, crackY);
    g.lineTo(crackRight, crackY);

    _L.bg.addChild(g);
    // Flatten the entire static background (incl. the ~1500-segment hex grid) into a
    // single GPU texture so it costs one quad per frame instead of re-tessellating.
    _L.bg.cacheAsBitmap = true;
  }

  function _hexGrid(g) {
    const s  = 46;
    const hh = s * Math.sqrt(3) / 2;
    g.lineStyle(1, 0x160204, 0.55); // dark blood-tinted lines
    const cols = Math.ceil(W() / (s * 1.5)) + 2;
    const rows = Math.ceil(H() / (hh * 2)) + 2;
    for (let row = -1; row < rows; row++) {
      for (let col = -1; col < cols; col++) {
        const cx = col * s * 1.5;
        const cy = row * hh * 2 + (col % 2 ? hh : 0);
        for (let i = 0; i < 6; i++) {
          const a0 = (Math.PI / 3) * i - Math.PI / 6;
          const a1 = (Math.PI / 3) * ((i + 1) % 6) - Math.PI / 6;
          const r  = s * 0.8;
          if (i === 0) g.moveTo(cx + r * Math.cos(a0), cy + r * Math.sin(a0));
          g.lineTo(cx + r * Math.cos(a1), cy + r * Math.sin(a1));
        }
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // BOARD ZONES
  // ════════════════════════════════════════════════════════════════════════════
  // Zone layout constants — used by _buildZones AND _layoutBoard / _layoutHand.
  // The opponent strip is deliberately COMPACT (smaller cards, shorter zone):
  // with 2–8 players, opponents only need a seat panel + a slim board row,
  // while the active player's own area keeps full-size cards.
  const OPP_CARD_SCALE = 0.74; // opponent board characters render compactly
  const ZONE = {
    w:    () => Math.min(W() - SAFE * 2 - RIGHT_RAIL_W(), W() * (_isNarrow() ? 0.90 : _isShortWide() ? 0.76 : 0.70)),
    hOpp: () => Math.min(H() * (_isCompact() ? 0.19 : 0.24), CC.h * OPP_CARD_SCALE + 36),
    hOwn: () => Math.min(H() * (_isCompact() ? 0.28 : 0.30), CC.h + 36),
    p2Y:  () => SAFE + SEAT_H() + (_isNarrow() ? 12 : _isShortWide() ? 34 : 36),        // below the opponent seat panel
    p1Y:  () => H() * (_isNarrow() ? 0.41 : _isShortWide() ? 0.455 : 0.43),
    // Back-compat alias (own zone) for any remaining callers
    h:    () => ZONE.hOwn(),
  };

  function _buildZones() {
    if (_zonesBuiltSize.w === W() && _zonesBuiltSize.h === H()) return;
    _zonesBuiltSize = { w: W(), h: H() };
    _L.zones.removeChildren();
    const cx = W() * 0.5;
    const zW = ZONE.w();

    // Opponent zone (top) — death purple tint, compact
    const p2 = new PIXI.Graphics();
    p2.lineStyle(1.5, 0x440044, 0.55);
    p2.beginFill(0x140008, 0.25);
    p2.drawRoundedRect(cx - zW/2, ZONE.p2Y(), zW, ZONE.hOpp(), 14);
    p2.endFill();
    _L.zones.addChild(p2);

    // Player zone (bottom) — blood red tint, full size
    const p1 = new PIXI.Graphics();
    p1.lineStyle(1.5, 0x550000, 0.55);
    p1.beginFill(0x140004, 0.25);
    p1.drawRoundedRect(cx - zW/2, ZONE.p1Y(), zW, ZONE.hOwn(), 14);
    p1.endFill();
    _L.zones.addChild(p1);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // HUD — info bars + centre strip
  // ════════════════════════════════════════════════════════════════════════════
  function _buildHUD() {
    _L.hud.removeChildren();
    _hud = {};
    _hud.p2bar = _makeInfoBar('p2');
    _L.hud.addChild(_hud.p2bar);
    _hud.p1bar = _makeInfoBar('p1');
    _L.hud.addChild(_hud.p1bar);
    _hud.center = _buildManaGauge();
    _L.hud.addChild(_hud.center);
    _repositionHUD();
  }

  // Opponent seat panel width — compact so 2–8 player seats can sit in a row
  const SEAT_W = () => Math.min(_isCompact() ? W() - SAFE * 2 : 420, W() - SAFE * 2);
  const SEAT_H = () => _isCompact() ? 54 : 58;

  function _makeInfoBar(pid) {
    const ct   = new PIXI.Container();
    const isP1 = pid === 'p1';
    const col  = isP1 ? 0xcc2200 : 0x9900aa; // blood red / death purple

    if (!isP1) {
      const seatW = SEAT_W();
      const seatH = SEAT_H();
      // ── OPPONENT SEAT — compact rounded panel (repeatable for 2–8 players) ──
      const bg = new PIXI.Graphics();
      bg.lineStyle(1.5, 0x440044, 0.7);
      bg.beginFill(0x0a0210, 0.94);
      bg.drawRoundedRect(0, 0, seatW, seatH, 12);
      bg.endFill();
      ct.addChild(bg); ct._bg = bg;

      const pip = new PIXI.Graphics();
      pip.lineStyle(2, col, 0.9);
      pip.beginFill(0x080618, 0.96);
      pip.drawCircle(28, seatH / 2, 16);
      pip.endFill();
      const pipN = _T('2', {
        fontFamily: "'Exo 2', sans-serif", fontSize: 13, fontWeight: '900', fill: col,
      });
      pipN.anchor.set(0.5); pipN.position.set(28, seatH / 2);
      pip.addChild(pipN);
      ct.addChild(pip); ct._pipNum = pipN;

      const lbl = _T('OPPONENT', {
        fontFamily: "'Rajdhani', sans-serif", fontSize: 12, fontWeight: '800',
        fill: 0xa088bb, letterSpacing: 1,
      });
      lbl.position.set(58, 7);
      ct.addChild(lbl); ct._lbl = lbl;

      const hpNum = _T('20', {
        fontFamily: "'Exo 2', sans-serif", fontSize: 20, fontWeight: '900', fill: 0xff3300,
      });
      hpNum.position.set(58, 25);
      ct.addChild(hpNum); ct._hpNum = hpNum;

      // HP bar
      const BX = 108, BY = 34, BW = Math.max(96, seatW - 238), BH = 9;
      const barBg = new PIXI.Graphics();
      barBg.beginFill(0x180818); barBg.drawRoundedRect(BX, BY, BW, BH, 4); barBg.endFill();
      ct.addChild(barBg);
      const barFg = new PIXI.Graphics();
      barFg.beginFill(P.green); barFg.drawRoundedRect(BX, BY, BW, BH, 4); barFg.endFill();
      ct.addChild(barFg);
      ct._barFg = barFg;
      ct._barSpec = { x: BX, y: BY, w: BW, h: BH };

      // Hand + board counts (replaces the old row of face-down cards —
      // an opponent's hidden hand doesn't deserve board real estate)
      const stats = _T('HAND 0 / FIELD 0', {
        fontFamily: "'Rajdhani', sans-serif", fontSize: 13, fontWeight: '800', fill: 0xa695c8,
      });
      stats.anchor.set(1, 0.5); stats.position.set(seatW - 16, 35);
      ct.addChild(stats); ct._stats = stats;
      return ct;
    }

    // ── ACTIVE PLAYER BAR — full-width strip, inset from screen edges ────────
    const barW = W() - SAFE * 2;
    const bg = new PIXI.Graphics();
    bg.lineStyle(1.5, 0x550000, 0.55);
    bg.beginFill(0x020002, 0.94);
    bg.drawRoundedRect(0, 0, barW, ACTIVE_BAR_H, 10);
    bg.endFill();
    ct.addChild(bg); ct._bg = bg;

    const pip = new PIXI.Graphics();
    pip.lineStyle(2, col, 0.9);
    pip.beginFill(0x080618, 0.96);
    pip.drawCircle(25, ACTIVE_BAR_H / 2, 19);
    pip.endFill();
    const pipN = _T('1', {
      fontFamily: "'Exo 2', sans-serif", fontSize: 14, fontWeight: '900', fill: col,
    });
    pipN.anchor.set(0.5); pipN.position.set(25, ACTIVE_BAR_H / 2);
    pip.addChild(pipN);
    ct.addChild(pip); ct._pipNum = pipN;

    const lbl = _T('YOU', {
      fontFamily: "'Rajdhani', sans-serif", fontSize: 12, fontWeight: '800',
      fill: 0x8888aa, letterSpacing: 1,
    });
    lbl.position.set(58, 7);
    ct.addChild(lbl); ct._lbl = lbl;

    const hpNum = _T('20', {
      fontFamily: "'Exo 2', sans-serif", fontSize: 24, fontWeight: '900', fill: 0xff3300,
    });
    hpNum.position.set(58, 25);
    ct.addChild(hpNum); ct._hpNum = hpNum;

    // HP bar track + fill
    const BX = 116, BY = 31, BW = Math.min(430, W() * 0.36), BH = 11;
    const barBg = new PIXI.Graphics();
    barBg.beginFill(0x180808); barBg.drawRoundedRect(BX, BY, BW, BH, 5); barBg.endFill();
    ct.addChild(barBg);
    const barFg = new PIXI.Graphics();
    barFg.beginFill(P.green); barFg.drawRoundedRect(BX, BY, BW, BH, 5); barFg.endFill();
    ct.addChild(barFg);
    ct._barFg = barFg;
    ct._barSpec = { x: BX, y: BY, w: BW, h: BH };

    // Right side: phase + turn labels
    {
      const phaseTxt = _T('', {
        fontFamily: "'Exo 2', sans-serif", fontSize: 13, fontWeight: '900',
        fill: 0x9b72ef, letterSpacing: 1,
      });
      phaseTxt.anchor.set(1, 0); phaseTxt.position.set(barW - 16, 9);
      ct.addChild(phaseTxt); ct._phaseTxt = phaseTxt;

      const turnTxt = _T('', {
        fontFamily: "'Rajdhani', sans-serif", fontSize: 12, fill: 0xaaa0be,
      });
      turnTxt.anchor.set(1, 0); turnTxt.position.set(barW - 16, 30);
      ct.addChild(turnTxt); ct._turnTxt = turnTxt;

      ct._stats = { text: '' }; // stub so _updateHUD doesn't crash
    }

    return ct;
  }

  function _buildManaGauge() {
    // Liquid mana gauge (6 fillable orbs) at left-of-center + dice panel at right
    const ct = new PIXI.Container();
    ct._dots = [];

    const MAX_MANA = 6;
    const gCX      = W() * (_isCompact() ? 0.50 : 0.22);   // gauge centred here
    const spc      = _isCompact() ? 23 : 27;
    const gStartX  = gCX - (MAX_MANA - 1) * spc / 2;

    for (let i = 0; i < MAX_MANA; i++) {
      const dot = new PIXI.Container();
      dot.x = gStartX + i * spc;
      dot.y = 0;

      // Glow ring behind filled orb
      const glow = new PIXI.Graphics();
      for (let r = 18; r >= 10; r -= 2) {
        glow.beginFill(0xff2200, ((18 - r) / 18) * 0.35);
        glow.drawCircle(0, 0, r);
        glow.endFill();
      }
      glow.alpha = 0;
      dot.addChild(glow); dot._glow = glow;

      // Empty ring (always visible, dim)
      const ring = new PIXI.Graphics();
      ring.lineStyle(2, 0x440000, 0.45);
      ring.beginFill(0x0a0204, 0.55);
      ring.drawCircle(0, 0, 9);
      ring.endFill();
      dot.addChild(ring);

      // Filled orb — hellfire red
      const fill = new PIXI.Graphics();
      for (let r = 9; r >= 1; r -= 1.5) {
        const t = (9 - r) / 9;
        fill.beginFill(0xcc2200, 0.25 + t * 0.70);
        fill.drawCircle(0, 0, r);
        fill.endFill();
      }
      fill.beginFill(0xff8844, 0.55); fill.drawCircle(0, 0, 3); fill.endFill();
      fill.alpha = 0; fill.scale.set(0.1);
      dot.addChild(fill); dot._fill = fill;

      ct.addChild(dot);
      ct._dots.push(dot);
    }

    // MANA label below dots
    const manaLbl = _T('MANA', {
      fontFamily: "'Rajdhani', sans-serif", fontSize: 8, fontWeight: '700',
      fill: 0x551100, letterSpacing: 3,
    });
    manaLbl.anchor.set(0.5, 0); manaLbl.position.set(gCX, 17);
    ct.addChild(manaLbl);

    // ── Spinning skull-pip dice — above the action buttons (right rail) ──────────
    // Positioned via shared HUD_DIE anchor (child of the centre strip, so offset
    // by the strip's own y).
    const dc = new PIXI.Container();
    dc.position.set(HUD_DIE().x, HUD_DIE().y - HUD_CENTER_Y());
    dc._value = 0;

    // Die face body
    const diceFace = new PIXI.Graphics();
    diceFace.lineStyle(2.5, 0x880000, 0.88);
    diceFace.beginFill(0x0e0204, 0.96);
    diceFace.drawRoundedRect(-27, -27, 54, 54, 7);
    diceFace.endFill();
    // Subtle bevel highlights
    diceFace.lineStyle(1, 0x441100, 0.45);
    diceFace.moveTo(-24, 24); diceFace.lineTo(-24, -24); diceFace.lineTo(24, -24);
    diceFace.lineStyle(1, 0x000000, 0.55);
    diceFace.moveTo(-24, 24); diceFace.lineTo(24, 24); diceFace.lineTo(24, -24);
    dc.addChild(diceFace);
    dc._face = diceFace;

    // Pips container (filled by _updateDicePips)
    const pips = new PIXI.Container();
    dc.addChild(pips);
    dc._pips = pips;

    // LAST ROLL label
    const diceLbl = _T('LAST ROLL', {
      fontFamily: "'Rajdhani', sans-serif", fontSize: 7, fontWeight: '700',
      fill: 0x551100, letterSpacing: 2,
    });
    diceLbl.anchor.set(0.5, 0); diceLbl.position.set(0, 31);
    dc.addChild(diceLbl);

    ct.addChild(dc);
    ct._diceContainer = dc;
    // Backward-compat stubs
    ct._diceNum = { text: '—', style: { fill: 0xff3300 } };
    ct._mana  = { text: '0' };
    ct._phase = { text: '' };
    ct._turn  = { text: '' };
    ct._orb   = { scale: { x: 1, y: 1 } };

    return ct;
  }

  // ── Skull pip positions per die face ─────────────────────────────────────────
  const _DICE_PIPS = {
    1: [[0, 0]],
    2: [[-1, -1], [1, 1]],
    3: [[-1, -1], [0, 0], [1, 1]],
    4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
    5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
    6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
  };

  function _drawSkullPip(g, px, py) {
    const s = 4.8;
    g.beginFill(0xdd1100, 0.92);
    g.drawEllipse(px, py - 0.8, s, s * 0.88);  // skull head
    g.endFill();
    g.beginFill(0xaa0e00, 0.82);
    g.drawRoundedRect(px - s * 0.58, py + s * 0.22, s * 1.16, s * 0.52, s * 0.18); // jaw
    g.endFill();
    g.beginFill(0x000000, 0.95);
    g.drawEllipse(px - s * 0.31, py - 0.9, s * 0.21, s * 0.25); // left eye
    g.drawEllipse(px + s * 0.31, py - 0.9, s * 0.21, s * 0.25); // right eye
    g.endFill();
  }

  function _updateDicePips(dc, value) {
    dc._pips.removeChildren();
    if (!value || value < 1 || value > 6) return;
    const g = new PIXI.Graphics();
    const spread = 13;
    for (const [cx, cy] of (_DICE_PIPS[value] ?? [])) {
      _drawSkullPip(g, cx * spread, cy * spread);
    }
    dc._pips.addChild(g);
    // _pipScale lets the large die reuse this function with scaled pips
    if (dc._pipScale) dc._pips.scale.set(dc._pipScale);
    dc._value = value;
  }

  // Build a standalone die container of arbitrary `size` px (centred at 0,0)
  function _buildLargeDie(size) {
    const ct = new PIXI.Container();
    const half = size / 2;
    const face = new PIXI.Graphics();
    face.lineStyle(size * 0.046, 0x880000, 0.90);
    face.beginFill(0x0e0204, 0.97);
    face.drawRoundedRect(-half, -half, size, size, size * 0.13);
    face.endFill();
    // Bevel
    face.lineStyle(size * 0.018, 0x551100, 0.45);
    face.moveTo(-half+5, half-5); face.lineTo(-half+5, -half+5); face.lineTo(half-5, -half+5);
    face.lineStyle(size * 0.018, 0x000000, 0.55);
    face.moveTo(-half+5, half-5); face.lineTo(half-5, half-5); face.lineTo(half-5, -half+5);
    ct.addChild(face); ct._face = face;
    const pips = new PIXI.Container();
    ct.addChild(pips); ct._pips = pips;
    ct._pipScale = size / 54; // 54 px is the standard die size
    ct._value    = 0;
    return ct;
  }

  function _repositionHUD() {
    if (_hud.p1bar)  _hud.p1bar.position.set(SAFE, H() - ACTIVE_BAR_H - SAFE);
    if (_hud.p2bar)  _hud.p2bar.position.set(W() / 2 - SEAT_W() / 2, SAFE); // seat: top-center
    if (_hud.center) _hud.center.y = HUD_CENTER_Y(); // mana strip in the board gap
  }

  function _updateHUD() {
    if (!_hud.center || !GameState) return;

    const phase       = GameState.currentPhase ?? 'rolloff';
    const activePid   = GameState.currentTurn  ?? 'p1';
    const inactivePid = activePid === 'p1' ? 'p2' : 'p1';
    const mana        = GameState.getMana?.()  ?? 0;

    // Bottom bar = active player, top seat = opponent — both show real names
    if (_hud.p1bar?._pipNum) _hud.p1bar._pipNum.text = activePid === 'p1' ? '1' : '2';
    if (_hud.p2bar?._pipNum) _hud.p2bar._pipNum.text = inactivePid === 'p1' ? '1' : '2';
    if (_hud.p1bar?._lbl)    _hud.p1bar._lbl.text    =
      `${(GameState.getPlayerLabel?.(activePid) ?? 'YOU').toUpperCase()} — YOUR TURN`;
    if (_hud.p2bar?._lbl)    _hud.p2bar._lbl.text    =
      (GameState.getPlayerLabel?.(inactivePid) ?? 'OPPONENT').toUpperCase();

    // Phase + turn label (bottom bar right)
    const phaseLabel = phase === 'rolloff' ? 'ROLL-OFF' : phase.toUpperCase() + ' PHASE';
    const turnLabel  = `${GameState.getPlayerLabel?.(activePid) ?? activePid}'s Turn`;
    if (_hud.p1bar?._phaseTxt) _hud.p1bar._phaseTxt.text = phaseLabel;
    if (_hud.p1bar?._turnTxt)  _hud.p1bar._turnTxt.text  = turnLabel;

    // Update each bar with its player's data (bottom=active, top=inactive)
    const _applyBar = (bar, pid) => {
      if (!bar) return;
      const st = GameState.getPlayerState?.(pid);
      if (!st) return;
      bar._hpNum.text = String(st.hp);
      const pct = Math.max(0, Math.min(1, st.hp / 20));
      const { x, y, w, h } = bar._barSpec;
      const col = pct > 0.5 ? P.green : pct > 0.2 ? P.warn : P.red;
      bar._barFg.clear();
      bar._barFg.beginFill(col);
      bar._barFg.drawRoundedRect(x, y, Math.max(4, w * pct), h, 5);
      bar._barFg.endFill();
      if (bar._stats?.text !== undefined) {
        const hc = (st.hand.heroes?.length ?? 0) + (st.hand.actions?.length ?? 0);
        bar._stats.text = `HAND ${hc} / FIELD ${st.board?.length ?? 0}`;
      }
    };
    _applyBar(_hud.p1bar, activePid);
    _applyBar(_hud.p2bar, inactivePid);

    // Mana gauge dots
    if (_hud.center?._dots) {
      _hud.center._dots.forEach((dot, i) => {
        const filled = i < mana;
        dot._fill.alpha = filled ? 1 : 0;
        dot._fill.scale.set(filled ? 1 : 0.1);
        if (dot._glow) dot._glow.alpha = filled ? 0.85 : 0;
      });
    }

    // HTML button states + roll pulse
    const $ = (id) => document.getElementById(id);
    const canRoll = PhaseManager?.canRoll?.() ?? false;
    if ($('btn-roll')) {
      $('btn-roll').disabled = !canRoll;
      $('btn-roll').classList.toggle('needs-roll', canRoll);
    }
    if ($('btn-end-turn')) $('btn-end-turn').disabled = !(PhaseManager?.canEndTurn?.() ?? false);
    if ($('btn-shop'))     $('btn-shop').disabled     = !(PhaseManager?.canShop?.()    ?? false);

    const actions = document.getElementById('game-actions');
    if (actions) {
      const bottomDock = window.matchMedia?.('(max-width: 900px), (pointer: coarse)')?.matches;
      if (bottomDock) {
        actions.style.top = '';
        actions.style.transform = 'translateX(-50%)';
      } else {
        actions.style.top = `${ZONE.p1Y() + ZONE.hOwn() / 2}px`;
        actions.style.transform = 'translateY(-50%)';
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CARD BUILDING — shared helpers
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Clipped art group — native Image loading + texture cache, correct z-order.
   * fullCard=true  – fit PNG width + bottom-align so the card's white text box
   *   (bottom ~20 % of source PNG) is always visible. No vignette.
   * fullCard=false – 1.22× cover crop + top-align + vignette (board chars).
   */
  function _artGroup(imgUrl, x, y, w, h, rad, fullCard = false) {
    const ct = new PIXI.Container();

    // z=0: dark background
    const bg = new PIXI.Graphics();
    bg.beginFill(0x0d0204, 1);
    bg.drawRoundedRect(x, y, w, h, rad ?? 8);
    bg.endFill();
    ct.addChild(bg);

    // Vignette only for board-char partial-art mode
    if (!fullCard) {
      const grad = new PIXI.Graphics();
      for (let i = 0; i < 10; i++) {
        grad.beginFill(P.card, (i / 10) * 0.82);
        grad.drawRect(x, y + h - 10 + i, w, 1.5);
        grad.endFill();
      }
      ct.addChild(grad);
    }

    // Rounded clip mask
    const mask = new PIXI.Graphics();
    mask.beginFill(0xffffff, 1);
    mask.drawRoundedRect(x, y, w, h, rad ?? 8);
    mask.endFill();
    ct.addChild(mask);
    ct.mask = mask;

    const apply = (texture) => {
      if (!texture?.width) return;
      const spr = new PIXI.Sprite(texture);
      if (fullCard) {
        // Fit PNG to card width; bottom-align so white text box stays at card bottom
        const scale = w / texture.width;
        spr.scale.set(scale);
        spr.x = x;
        const sprH = texture.height * scale;
        spr.y = y + Math.max(0, h - sprH);
      } else {
        const zoom  = 1.22;
        const scale = Math.max(w / texture.width, h / texture.height) * zoom;
        spr.scale.set(scale);
        spr.x = x + (w - spr.width) / 2;
        spr.y = y;
      }
      ct.addChildAt(spr, 1);
    };

    if (_texCache.has(imgUrl)) {
      apply(_texCache.get(imgUrl));
    } else {
      const img = new Image();
      img.onload = () => {
        try {
          const tex = PIXI.Texture.from(img);
          _texCache.set(imgUrl, tex);
          apply(tex);
        } catch (_) {}
      };
      img.onerror = () => {};
      img.src = imgUrl;
    }

    return ct;
  }

  /** Small circle cost badge */
  function _costBadge(cost, x, y, free) {
    const ct = new PIXI.Container();
    const g  = new PIXI.Graphics();
    g.lineStyle(1.5, free ? 0x40e870 : P.gold, 0.95);
    g.beginFill(0x060412, 0.94);
    g.drawCircle(x, y, 12);
    g.endFill();
    ct.addChild(g);
    const t = _T(String(cost ?? 0), {
      fontFamily: "'Exo 2', sans-serif", fontSize: 11, fontWeight: '900',
      fill: free ? 0x40e870 : P.gold, resolution: TXT_RES,
    });
    t.anchor.set(0.5); t.position.set(x, y);
    ct.addChild(t);
    return ct;
  }

  // ── Card PNG geometry — measured from the actual art assets ────────────────
  // Name banner ends ~0.67h · WHITE TEXT BOX spans ~0.69h → 0.915h · border below.
  // ALL card text must stay inside the box or it bleeds onto the black border.
  const CARD_BOX_TOP = 0.695;
  const CARD_BOX_BOT = 0.912;

  /** Truncate a single line with '…' so it never exceeds maxW pixels. */
  function _truncate(str, styleObj, maxW) {
    if (!str) return '';
    const style = new PIXI.TextStyle(styleObj);
    if (PIXI.TextMetrics.measureText(str, style).width <= maxW) return str;
    let s = str;
    while (s.length > 1 && PIXI.TextMetrics.measureText(s + '…', style).width > maxW) {
      s = s.slice(0, -1);
    }
    return s.trimEnd() + '…';
  }

  /** Trim a wrapped paragraph word-by-word until it fits maxH pixels tall. */
  function _fitPara(str, styleObj, maxW, maxH) {
    if (!str) return '';
    const style = new PIXI.TextStyle({ ...styleObj, wordWrap: true, wordWrapWidth: maxW });
    let s = str;
    while (s && PIXI.TextMetrics.measureText(s, style).height > maxH) {
      const cut = s.replace(/\s+\S+$/, '');
      if (cut === s) break; // single word left
      s = cut;
    }
    return s === str ? s : s + '…';
  }

  /**
   * Circular stat gem — Hearthstone-style corner stat. Drawn with Graphics so
   * it renders identically everywhere (unicode glyphs like ⚔/♥ do NOT render
   * reliably inside a canvas and looked like 'X' / '7').
   * arrow: 1 = buffed (green ▲), -1 = debuffed (red ▼)
   */
  function _statGem(x, y, r, fillCol, ringCol, numText, arrow = 0) {
    const g = new PIXI.Container();
    g.position.set(x, y);

    const bg = new PIXI.Graphics();
    bg.lineStyle(2.5, ringCol, 1);
    bg.beginFill(fillCol, 1);
    bg.drawCircle(0, 0, r);
    bg.endFill();
    g.addChild(bg);

    // glossy highlight
    const hi = new PIXI.Graphics();
    hi.beginFill(0xffffff, 0.20);
    hi.drawEllipse(-r * 0.22, -r * 0.36, r * 0.52, r * 0.34);
    hi.endFill();
    g.addChild(hi);

    // 2+ digit numbers get a smaller font so they stay inside the gem
    const digits = String(numText).length;
    const t = _T(String(numText), {
      fontFamily: "'Exo 2', sans-serif",
      fontSize: Math.round(r * (digits >= 2 ? 0.92 : 1.15)),
      fontWeight: '900',
      fill: 0xffffff, stroke: 0x000000, strokeThickness: 3, resolution: TXT_RES,
    });
    t.anchor.set(0.5); t.position.set(0, 0.5);
    g.addChild(t);

    if (arrow) {
      const a = new PIXI.Graphics();
      const up = arrow > 0;
      a.lineStyle(1, 0x000000, 0.7);
      a.beginFill(up ? 0x33ee66 : 0xff4444, 1);
      if (up) a.drawPolygon([0, -r - 10, -5.5, -r - 1, 5.5, -r - 1]);
      else    a.drawPolygon([0, -r - 1, -5.5, -r - 10, 5.5, -r - 10]);
      a.endFill();
      g.addChild(a);
    }
    return g;
  }

  /**
   * Unified card text box: ability/passive lines + corner stat gems.
   * ATK gem bottom-left (gold) · HP gem bottom-right (red) — familiar CCG layout.
   * info: { hpNum, atkNum, atkMod, line1, line2, hpBarPct }
   */
  function _cardTextBox(ct, w, h, info) {
    const boxTop = Math.round(h * CARD_BOX_TOP);
    const gemR   = Math.max(12, Math.round(w * 0.105));
    const gemY   = h - gemR - 7;   // inside the card's rounded corner
    const inset  = Math.round(w * 0.09); // clear of the white box's jagged edges

    // Ability / passive lines — one line each, truncated, stop above the gems
    const lineSize = Math.max(8, Math.round(w * 0.068));
    let y = boxTop + 3;
    const maxY = gemY - gemR - 2;
    const addLine = (text, fill, italic) => {
      if (!text || y + lineSize > maxY) return;
      const style = {
        fontFamily: "'Rajdhani', sans-serif", fontSize: lineSize, fontWeight: '600',
        fill, resolution: TXT_RES, ...(italic ? { fontStyle: 'italic' } : {}),
      };
      const t = _T(_truncate(text, style, w - inset * 2), style);
      t.position.set(inset, y); ct.addChild(t);
      y += lineSize + 3;
    };
    addLine(info.line1, 0x21215a, false);
    addLine(info.line2, 0x4a2a6a, true);

    // HP bar strip between the gems (board characters only)
    if (info.hpBarPct != null) {
      const bx = gemR * 2 + 12, bw = w - (gemR * 2 + 12) * 2;
      const bg = new PIXI.Graphics();
      bg.beginFill(0x1a0808, 0.9); bg.drawRoundedRect(bx, h - 14, bw, 5, 2); bg.endFill();
      ct.addChild(bg);
      const pct = info.hpBarPct;
      const fg = new PIXI.Graphics();
      fg.beginFill(pct > 0.5 ? 0x2ecc40 : pct > 0.2 ? 0xff8800 : 0xff3322);
      fg.drawRoundedRect(bx, h - 14, Math.max(3, bw * pct), 5, 2); fg.endFill();
      ct.addChild(fg);
    }

    // Corner gems — drawn ABOVE lines/bar, kept inside the card frame
    ct.addChild(_statGem(gemR + 7, gemY, gemR, 0x9a6d12, 0xe8c353, info.atkNum, info.atkMod ?? 0));
    ct.addChild(_statGem(w - gemR - 7, gemY, gemR, 0xa32222, 0xff6655, info.hpNum));
  }

  /**
   * Status pill: dark capsule + drawn colour-coded icon + remaining turns.
   * Icon shapes per status family (drawn — reliable in canvas, unlike emoji):
   *   poison=green droplet · buff=green ▲ · weaken=red ▼ · taunt=orange shield
   *   disable=grey ✕ · charm/drunk=pink heart · burn=orange flame · frost=cyan ◆
   */
  function _statusPill(s) {
    const sid = (s.id ?? '').replace(/^status_/, '');
    const chip = new PIXI.Container();
    const dur  = s.remainingDuration != null ? String(s.remainingDuration) : '';
    const PW   = dur ? 34 : 22, PH = 18;
    chip._pw = PW;

    const pill = new PIXI.Graphics();
    pill.lineStyle(1, 0x000000, 0.65);
    pill.beginFill(0x0a0510, 0.90);
    pill.drawRoundedRect(0, 0, PW, PH, 9);
    pill.endFill();
    chip.addChild(pill);

    const icon = new PIXI.Graphics();
    const cx = 11, cy = PH / 2;
    switch (sid) {
      case 'poisoned': case 'poison': // green droplet
        icon.beginFill(0x33dd55); icon.drawCircle(cx, cy + 1.5, 4.5);
        icon.drawPolygon([cx, cy - 6.5, cx - 3.4, cy - 0.5, cx + 3.4, cy - 0.5]); icon.endFill();
        break;
      case 'augmented': case 'accelerated': case 'buffed': // green up-arrow
        icon.beginFill(0x33ee66);
        icon.drawPolygon([cx, cy - 6, cx - 5.5, cy + 4, cx + 5.5, cy + 4]); icon.endFill();
        break;
      case 'anemic': // red down-arrow
        icon.beginFill(0xff5544);
        icon.drawPolygon([cx, cy + 6, cx - 5.5, cy - 4, cx + 5.5, cy - 4]); icon.endFill();
        break;
      case 'taunt': // orange shield
        icon.beginFill(0xff9922);
        icon.drawPolygon([cx - 5, cy - 5.5, cx + 5, cy - 5.5, cx + 5, cy + 1, cx, cy + 6, cx - 5, cy + 1]);
        icon.endFill();
        break;
      case 'crippled': case 'impeded': case 'impaired': // grey X
        icon.lineStyle(2.6, 0xbbbbcc, 1);
        icon.moveTo(cx - 4.5, cy - 4.5); icon.lineTo(cx + 4.5, cy + 4.5);
        icon.moveTo(cx + 4.5, cy - 4.5); icon.lineTo(cx - 4.5, cy + 4.5);
        break;
      case 'charmed': case 'drunk': // pink heart
        icon.beginFill(0xff6699);
        icon.drawCircle(cx - 2.4, cy - 1.8, 3);
        icon.drawCircle(cx + 2.4, cy - 1.8, 3);
        icon.drawPolygon([cx - 5.2, cy - 0.4, cx + 5.2, cy - 0.4, cx, cy + 6]);
        icon.endFill();
        break;
      case 'burning': case 'burn': case 'example_timed': // orange flame
        icon.beginFill(0xff7722);
        icon.drawPolygon([cx, cy - 7, cx - 4.5, cy + 2, cx + 4.5, cy + 2]);
        icon.drawCircle(cx, cy + 2.5, 4.2); icon.endFill();
        break;
      case 'frozen': case 'freeze': // cyan diamond
        icon.beginFill(0x55ccff);
        icon.drawPolygon([cx, cy - 6, cx + 5, cy, cx, cy + 6, cx - 5, cy]); icon.endFill();
        break;
      case 'edible': // gold drumstick-ish dot
        icon.beginFill(0xffcc33); icon.drawCircle(cx, cy, 4.6); icon.endFill();
        break;
      default: // unknown — neutral dot
        icon.beginFill(0x9999bb); icon.drawCircle(cx, cy, 4.2); icon.endFill();
    }
    chip.addChild(icon);

    if (dur) {
      const t = _T(dur, {
        fontFamily: "'Exo 2', sans-serif", fontSize: 11, fontWeight: '900',
        fill: 0xffffff, resolution: TXT_RES,
      });
      t.anchor.set(0.5); t.position.set(PW - 8, PH / 2 + 0.5);
      chip.addChild(t);
    }
    return chip;
  }

  /** Centred name text */
  function _nameText(name, cx, y, maxW) {
    const t = _T(name, {
      fontFamily: "'Exo 2', sans-serif", fontSize: 8, fontWeight: '800',
      fill: P.text, wordWrap: true, wordWrapWidth: maxW, align: 'center', resolution: TXT_RES,
    });
    t.anchor.set(0.5, 0); t.position.set(cx, y);
    return t;
  }

  /** Dark strip at card bottom */
  function _strip(w, h, y) {
    const g = new PIXI.Graphics();
    g.beginFill(0x030212, 0.93);
    g.drawRoundedRect(0, y, w, h, 8);
    g.endFill();
    return g;
  }

  /** Clickable button inside a strip */
  function _stripBtn(label, cx, cy, bw, bh, color, onClick) {
    const ct = new PIXI.Container();
    ct.position.set(cx - bw / 2, cy - bh / 2);
    const bg = new PIXI.Graphics();
    bg.beginFill(color, 0.88);
    bg.drawRoundedRect(0, 0, bw, bh, 5);
    bg.endFill();
    ct.addChild(bg); ct._bg = bg;
    const lbl = _T(label, {
      fontFamily: "'Exo 2', sans-serif", fontSize: 8, fontWeight: '900', fill: 0xffffff, resolution: TXT_RES,
    });
    lbl.anchor.set(0.5); lbl.position.set(bw / 2, bh / 2);
    ct.addChild(lbl);
    ct.interactive = true; ct.cursor = 'pointer';
    ct.on('pointerdown', (e) => { e.stopPropagation(); onClick?.(); });
    ct.on('pointerover',  () => gsap.to(ct.scale, { x: 1.07, y: 1.07, duration: 0.12 }));
    ct.on('pointerout',   () => gsap.to(ct.scale, { x: 1.0,  y: 1.0,  duration: 0.12 }));
    return ct;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // HERO HAND CARD
  // ════════════════════════════════════════════════════════════════════════════
  function _heroCard(card, owner) {
    const { w, h } = HC;
    const ct = new PIXI.Container();
    ct._cardData = card; ct._cardType = 'hero'; ct._owner = owner;
    ct._baseX = 0; ct._baseY = 0;

    const isOwn = owner === 'p1';
    const name  = _parseName(card);
    const free  = (card.manaCost ?? 0) === 0;

    // Shadow
    const sh = new PIXI.Graphics();
    sh.beginFill(0x000000, 0.44); sh.drawRoundedRect(4, 7, w, h, 11); sh.endFill();
    ct.addChild(sh);

    // Frame
    const frame = new PIXI.Graphics();
    frame.lineStyle(2, isOwn ? P.own : P.opp, 0.9);
    frame.beginFill(P.card); frame.drawRoundedRect(0, 0, w, h, 10); frame.endFill();
    ct.addChild(frame); ct._frame = frame;

    // Full-card art — PNG fills entire card; bottom-aligned so name banner + white
    // text box at bottom of PNG are always visible (no separate name overlay needed)
    if (card.imageAsset) {
      ct.addChild(_artGroup(HERO_DIR + _encAsset(card.imageAsset), 2, 2, w - 4, h - 4, 8, true));
    } else {
      const ph = new PIXI.Graphics();
      ph.beginFill(0x1a1550); ph.drawRoundedRect(2, 2, w - 4, h - 4, 8); ph.endFill();
      ct.addChild(ph);
    }

    // Cost badge overlaid top-left corner of art
    ct.addChild(_costBadge(card.manaCost ?? 0, 15, 15, free));

    // Stats + ability inside the card's WHITE TEXT BOX (matches the PNG art —
    // same gem layout as board character cards so hand/board look identical)
    const ab = _getCardAbilities(card);
    _cardTextBox(ct, w, h, {
      hpNum:  card.hp ?? '?',
      atkNum: card.baseAttack ?? '?',
      line1:  ab.ability1 ? ab.ability1.split('—')[0].trim() : null,
      line2:  ab.passive  ? ab.passive.split('—')[0].trim() : null,
    });

    // Interactivity — drag to deploy · click to read · right-click = mana
    ct.interactive = true; ct.cursor = 'grab';
    ct.on('pointerover',  () => _setHandHover(ct, true));
    ct.on('pointerout',   () => _setHandHover(ct, false));
    ct.on('pointerdown',  (e) => _dragStart(e, ct));
    ct.on('rightdown',    (e) => {
      e.stopPropagation();
      if (owner !== (GameState?.currentTurn ?? '')) return;
      _cbs.onDiscardMana?.({ card, type: 'hero', owner });
    });
    return ct;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ACTION HAND CARD
  // ════════════════════════════════════════════════════════════════════════════
  function _actionCard(card, owner) {
    const { w, h } = AC;
    const ct = new PIXI.Container();
    ct._cardData = card; ct._cardType = 'action'; ct._owner = owner;
    ct._baseX = 0; ct._baseY = 0;

    const isFree = card.manaCost === 0 || card.type === 'free';
    const imgUrl = ACTION_DIR + _encAsset(card.imageAsset ?? ACTION_DEF);

    const sh = new PIXI.Graphics();
    sh.beginFill(0x000000, 0.44); sh.drawRoundedRect(3, 6, w, h, 9); sh.endFill();
    ct.addChild(sh);

    const frame = new PIXI.Graphics();
    frame.lineStyle(2, isFree ? 0x30c870 : 0xe8a030, 0.85);
    frame.beginFill(P.card); frame.drawRoundedRect(0, 0, w, h, 9); frame.endFill();
    ct.addChild(frame); ct._frame = frame;

    // Full-card art — name banner is embedded in the PNG; no separate name overlay
    ct.addChild(_artGroup(imgUrl, 2, 2, w - 4, h - 4, 7, true));
    ct.addChild(_costBadge(card.manaCost ?? 0, 14, 14, isFree));

    // Description inside the card's WHITE TEXT BOX — trimmed to fit, never
    // spilling onto the card border
    const mana    = GameState?.getMana?.() ?? 0;
    const canPlay = isFree || mana >= (card.manaCost ?? 0);
    const boxY    = Math.round(h * CARD_BOX_TOP);
    const boxMaxH = Math.round(h * CARD_BOX_BOT) - boxY;
    const descSrc = card.description ?? card.effect ?? '';
    if (descSrc) {
      const style = {
        fontFamily: "'Rajdhani', sans-serif", fontSize: 8, fontWeight: '600',
        fill: 0x1a1a3a, resolution: TXT_RES,
      };
      const fitted = _fitPara(descSrc, style, w - 12, boxMaxH);
      const dt = _T(fitted, { ...style, wordWrap: true, wordWrapWidth: w - 12 });
      dt.position.set(6, boxY); ct.addChild(dt);
    }

    // Click to play (full targeting flow) · right-click to discard for mana
    ct.interactive = true; ct.cursor = canPlay ? 'pointer' : 'not-allowed';
    ct.on('pointerover', () => _setHandHover(ct, true));
    ct.on('pointerout',  () => _setHandHover(ct, false));
    ct.on('pointerdown', (e) => {
      if (_targetMode) return;
      e.stopPropagation();
      if (owner !== (GameState?.currentTurn ?? '')) return;
      _cbs.onActionPlay?.({ card, owner });
    });
    ct.on('rightdown', (e) => {
      e.stopPropagation();
      if (owner !== (GameState?.currentTurn ?? '')) return;
      _cbs.onDiscardMana?.({ card, type: 'action', owner });
    });
    return ct;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // BOARD CHARACTER CARD
  // ════════════════════════════════════════════════════════════════════════════
  function _charCard(char, owner) {
    const { w, h } = CC;
    const ct = new PIXI.Container();
    ct._charData = char; ct._owner = owner;

    const src   = char._sourceCard ?? {};
    const name  = src.name || _parseName(src) || char.name || '?';
    const hpPct = Math.max(0, Math.min(1, char.currentHp / (char.maxHp || 1)));
    const isOwn = owner === 'p1';
    const isTap = char.tapped || char.hasAttackedThisTurn;
    const bCol  = hpPct > 0.5 ? (isOwn ? P.own : P.opp) : hpPct > 0.2 ? P.warn : P.red;

    // Shadow
    const sh = new PIXI.Graphics();
    sh.beginFill(0x000000, 0.5); sh.drawRoundedRect(5, 8, w, h, 12); sh.endFill();
    ct.addChild(sh);

    // Frame
    const frame = new PIXI.Graphics();
    frame.lineStyle(3, bCol, 0.9);
    frame.beginFill(P.card); frame.drawRoundedRect(0, 0, w, h, 12); frame.endFill();
    ct.addChild(frame); ct._frame = frame;

    // Full-card art — IDENTICAL rendering to hand cards (PNG includes the name
    // banner + white text box), so cards look the same in hand and in play
    if (src.imageAsset) {
      ct.addChild(_artGroup(HERO_DIR + _encAsset(src.imageAsset), 2, 2, w - 4, h - 4, 10, true));
    } else {
      const ph = new PIXI.Graphics();
      ph.beginFill(0x1a1550); ph.drawRoundedRect(2, 2, w - 4, h - 4, 10); ph.endFill();
      ct.addChild(ph);
    }

    // Stats + ability in the white box. HP bar lives BETWEEN the corner gems at
    // the very bottom of the card — never over the name banner in the art.
    const ab = _getCardAbilities(src);
    const effAtk = GameState?.getEffectiveAttack?.(char) ?? char.baseAttack;
    const atkMod = effAtk - (char.baseAttack ?? 0);
    _cardTextBox(ct, w, h, {
      hpNum:    char.currentHp,
      atkNum:   effAtk,
      atkMod,
      hpBarPct: hpPct,
      line1:    ab.ability1 ? ab.ability1.split('—')[0].trim() : null,
      line2:    ab.passive  ? ab.passive.split('—')[0].trim() : null,
    });

    // Status effect overlays — visual cues for active statuses
    // (ids in data are prefixed 'status_' — normalize before matching)
    if (char.statuses?.length) {
      char.statuses.forEach(s => {
        const sid = (s.id ?? '').replace(/^status_/, '');
        let glowCol = null, hazeCol = null, borderCol = null;
        switch (sid) {
          case 'poison': case 'poisoned':
            glowCol = 0x00dd44; hazeCol = 0x00dd44; break;
          case 'taunt':
            borderCol = 0xff8800; break;
          case 'edible':
            borderCol = 0xffcc00; break;
          case 'burn': case 'burning': case 'example_timed':
            glowCol = 0xff4400; hazeCol = 0xff4400; break;
          case 'frozen': case 'freeze':
            glowCol = 0x44aaff; hazeCol = 0x4488ff; break;
          case 'buffed': case 'strengthen': case 'augmented': case 'accelerated':
            glowCol = 0x9955ff; break;
          case 'anemic':
            hazeCol = 0x661122; break;
          case 'crippled': case 'impeded': case 'impaired':
            hazeCol = 0x555566; break;
          case 'charmed': case 'drunk':
            glowCol = 0xff66aa; hazeCol = 0xff66aa; break;
        }
        if (hazeCol !== null) {
          const haze = new PIXI.Graphics();
          haze.beginFill(hazeCol, 0.14);
          haze.drawRoundedRect(0, 0, w, h, 12);
          haze.endFill();
          ct.addChild(haze);
        }
        if (borderCol !== null || glowCol !== null) {
          const col = borderCol ?? glowCol;
          for (let i = 0; i < 4; i++) {
            const ring = new PIXI.Graphics();
            ring.lineStyle(1.5 - i * 0.3, col, 0.55 - i * 0.1);
            ring.drawRoundedRect(i, i, w - 2*i, h - 2*i, 12);
            ct.addChild(ring);
          }
        }
      });
      // Status chips — drawn icon + turns-left number in dark pills. Icons are
      // Graphics shapes (canvas-safe), NOT emoji (emoji render as tofu boxes).
      let sx = 8; // inside the card frame + art border
      char.statuses.slice(0, 4).forEach(s => {
        const chip = _statusPill(s);
        chip.position.set(sx, Math.round(h * 0.115)); // below the art's cost tab
        ct.addChild(chip);
        sx += chip._pw + 4;
      });
    }

    // Tapped: dim slightly (rotation applied in _layoutBoard)
    if (isTap) {
      const tapG = new PIXI.Graphics();
      tapG.beginFill(0x000000, 0.30); tapG.drawRoundedRect(0, 0, w, h, 12); tapG.endFill();
      ct.addChild(tapG);
    }

    const myTurn = owner === (GameState?.currentTurn ?? '');
    const canAtk = myTurn && !isTap && (PhaseManager?.canAttack?.() ?? false);

    ct._cardType = 'char'; ct._charData = char;
    ct.interactive = true; ct.cursor = canAtk ? 'grab' : 'default';
    // Only add hover/drag when the card is usable
    if (!isTap) {
      ct.on('pointerover', () => _hover(ct, true));
      ct.on('pointerout',  () => _hover(ct, false));
    }
    if (canAtk) {
      ct.on('pointerdown', (e) => _dragStart(e, ct)); // drag=attack, click=panel
    } else if (myTurn && !isTap) {
      // Own char that can't attack right now — click still opens the info panel
      ct.on('pointerdown', (e) => {
        if (_targetMode) return;
        e.stopPropagation();
        ActionUI?.openCharPanel?.(char, owner);
      });
    }
    return ct;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CARD BACK (opponent hand)
  // ════════════════════════════════════════════════════════════════════════════
  function _cardBack() {
    const { w, h } = CB;
    const ct = new PIXI.Container();
    const g  = new PIXI.Graphics();
    g.lineStyle(1.5, 0x2a1e60, 0.85);
    g.beginFill(0x0e0b2a); g.drawRoundedRect(0, 0, w, h, 8); g.endFill();
    const d = 13;
    g.lineStyle(1, 0x1e1648, 0.45);
    for (let row = 0; row * d / 2 < h; row++) {
      for (let col = 0; col * d < w + d; col++) {
        const cx = col * d + (row % 2 ? d / 2 : 0), cy = row * d / 2;
        g.moveTo(cx, cy); g.lineTo(cx + d/2, cy + d/2);
        g.lineTo(cx, cy + d); g.lineTo(cx - d/2, cy + d/2); g.closePath();
      }
    }
    ct.addChild(g);
    return ct;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // HAND LAYOUT — fan arc for own turn, card backs for opponent
  // ════════════════════════════════════════════════════════════════════════════
  function _layoutHand(pid) {
    _hand[pid].forEach(c => c.parent?.removeChild(c));
    _hand[pid] = [];

    // Reset hand-hover state so the new layout starts collapsed
    if (pid === (GameState?.currentTurn ?? '')) {
      _handHoverCount = 0;
      if (_handCollapseTimer) { clearTimeout(_handCollapseTimer); _handCollapseTimer = null; }
    }

    const state = GameState?.getPlayerState?.(pid);
    if (!state) return;

    const isTurn = pid === (GameState?.currentTurn ?? '');

    // Opponent's hidden hand takes NO board space — their seat panel shows the
    // count instead (🂠 N). Essential once 2–8 players share the top strip.
    if (!isTurn) return;

    const cards = [
      ...(state.hand.heroes  ?? []).map(c => ({ card: c, type: 'hero'   })),
      ...(state.hand.actions ?? []).map(c => ({ card: c, type: 'action' })),
    ];
    const n = cards.length;
    if (n === 0) return;

    // Fan arc — big radius keeps cards nearly flat at the bottom.
    // Cap the fan angle so the outermost cards NEVER spill past the screen edges.
    const arcR   = Math.max(900, 1400 * _layoutScale());
    const availW = Math.max(200, W() - SAFE * 2 - HC.w - 30);
    const maxDeg = 2 * Math.asin(Math.min(0.45, availW / (2 * arcR))) * 180 / Math.PI;
    const fanDeg = Math.min(_isCompact() ? 12 : 22, n * (_isCompact() ? 2.4 : 3.4), maxDeg);
    const bCX    = W() * 0.5;
    const p1CardCY     = _handBaseY() + HC.h / 2;
    const bCY          = p1CardCY + arcR;

    cards.forEach(({ card, type }, i) => {
      const t   = n > 1 ? (i / (n - 1)) - 0.5 : 0;
      const ang = t * fanDeg * (Math.PI / 180);
      const cx  = bCX + Math.sin(ang) * arcR;
      const cy  = bCY - Math.cos(ang) * arcR;

      let ct;
      try {
        ct = type === 'action' ? _actionCard(card, pid) : _heroCard(card, pid);
      } catch(e) { return; }
      if (!ct) return;

      const cw = type === 'action' ? AC.w : HC.w;
      const ch = type === 'action' ? AC.h : HC.h;

      ct.rotation  = ang;
      ct.x         = cx - cw / 2;
      ct.y         = cy - ch / 2;
      ct._baseX    = ct.x;
      ct._baseY    = ct.y;
      ct._baseRot  = ang;
      ct._handIndex = i;
      ct._handN     = n;
      ct._handPid   = pid;

      _L.hand.addChild(ct); _hand[pid].push(ct);
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // BOARD LAYOUT
  // ════════════════════════════════════════════════════════════════════════════
  function _layoutBoard(pid) {
    _board[pid].forEach(c => c.parent?.removeChild(c));
    _board[pid] = [];

    const state = GameState?.getPlayerState?.(pid);
    if (!state?.board?.length) return;

    const chars = state.board;
    const n     = chars.length;
    const activePid = GameState?.currentTurn ?? 'p1';
    const isActive  = pid === activePid;

    // Opponent's board renders COMPACT (party layout: your cards get the space)
    const scale = isActive ? 1 : OPP_CARD_SCALE;
    const cw = CC.w * scale, ch = CC.h * scale;
    const gap   = Math.min(cw + (_isCompact() ? 8 : 18), (W() * (_isCompact() ? 0.82 : 0.70)) / n);
    const startX = W() / 2 - (gap * (n - 1)) / 2;
    const zH    = isActive ? ZONE.hOwn() : ZONE.hOpp();
    const zoneY = (isActive ? ZONE.p1Y() : ZONE.p2Y()) + zH / 2 - ch / 2;

    chars.forEach((char, i) => {
      const ct = _charCard(char, pid);
      ct.scale.set(scale);
      ct._baseScale = scale; // hover/leave restores THIS, not 1
      const isTap = char.tapped || char.hasAttackedThisTurn;
      const cardCX = startX + i * gap; // horizontal centre of slot

      if (isTap) {
        // Rotate 90° around card centre — set pivot to centre so rotation is in-place
        ct.pivot.set(CC.w / 2, CC.h / 2);
        ct.x = cardCX;
        ct.y = zoneY + ch / 2;
        ct.rotation = Math.PI / 2;
      } else {
        ct.x = cardCX - cw / 2;
        ct.y = zoneY;
      }
      ct._baseX = ct.x;
      ct._baseY = ct.y;

      ct.alpha = 0;
      const slideFrom = ct.y + 18;
      ct.y = slideFrom;
      gsap.to(ct, { alpha: 1, y: ct._baseY, duration: 0.32, ease: 'back.out(1.3)', delay: i * 0.06 });
      _L.cards.addChild(ct); _board[pid].push(ct);
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // TARGET MODE — click a highlighted card/icon to pick an effect target
  // ════════════════════════════════════════════════════════════════════════════
  // spec: { ownerId, mode: 'enemy_chars'|'ally_chars'|'enemy_any'|'ally_or_self',
  //         filter?: (charData) => bool }
  // onPick receives { type:'character'|'player', id } or null (cancelled).
  function enterTargetMode(spec, onPick) {
    exitTargetMode();
    _targetMode = { ...spec, onPick };
    _applyTargetHighlights();
  }

  function exitTargetMode() {
    _targetMode = null;
    _targetHighlights.forEach(({ g }) => { gsap.killTweensOf(g); g.parent?.removeChild(g); });
    _targetHighlights = [];
    Object.values(_playerIcons).forEach(ico => { if (ico) { gsap.killTweensOf(ico.scale); ico.scale.set(1); } });
  }

  function _targetCharPid() {
    const { ownerId, mode } = _targetMode;
    return (mode === 'ally_chars' || mode === 'ally_or_self')
      ? ownerId : (ownerId === 'p1' ? 'p2' : 'p1');
  }

  function _validTargetCards() {
    const { filter } = _targetMode;
    return _board[_targetCharPid()].filter(ct => !filter || filter(ct._charData));
  }

  function _targetPlayerPid() {
    const { ownerId, mode } = _targetMode;
    if (mode === 'enemy_any')    return ownerId === 'p1' ? 'p2' : 'p1';
    if (mode === 'ally_or_self') return ownerId;
    return null;
  }

  function _applyTargetHighlights() {
    _validTargetCards().forEach(ct => {
      const g = new PIXI.Graphics();
      g.lineStyle(4, 0xffdd33, 0.95);
      g.drawRoundedRect(-3, -3, CC.w + 6, CC.h + 6, 14);
      ct.addChild(g);
      gsap.to(g, { alpha: 0.35, duration: 0.5, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      _targetHighlights.push({ ct, g });
    });
    const pid = _targetPlayerPid();
    const ico = pid ? _playerIcons[pid] : null;
    if (ico) gsap.to(ico.scale, { x: 1.25, y: 1.25, duration: 0.5, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  }

  function _onStagePointerDown(event) {
    if (!_targetMode) return;
    const tm  = _targetMode;
    const pos = event.data.global;

    for (const ct of _validTargetCards()) {
      if (_hitTest(pos, ct)) {
        exitTargetMode();
        tm.onPick?.({ type: 'character', id: ct._charData.instanceId });
        return;
      }
    }
    const pid = _targetPlayerPid();
    if (pid && _hitTestIcon(pos, pid)) {
      exitTargetMode();
      tm.onPick?.({ type: 'player', id: pid });
      return;
    }
    // Clicked empty space — cancel (no cost)
    exitTargetMode();
    tm.onPick?.(null);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // HOVER + DRAG
  // ════════════════════════════════════════════════════════════════════════════
  function _hover(ct, on) {
    if (_drag) return;
    if (ct._baseY   === undefined) ct._baseY   = ct.y;
    if (ct._baseX   === undefined) ct._baseX   = ct.x;
    if (ct._baseRot === undefined) ct._baseRot = ct.rotation;
    gsap.killTweensOf(ct); gsap.killTweensOf(ct.scale);
    if (on) {
      if (ct.parent !== _L.fx) _L.fx.addChild(ct);
      _hoveredCard = ct;
      const scale  = _isCompact() ? 1.85 : 2.25; // zoom to make text readable on board chars
      const scaledW = CC.w * scale, scaledH = CC.h * scale;
      // Clamp so the ENTIRE zoomed card stays on screen (incl. the text box)
      const targetX = Math.max(8, Math.min(W() - scaledW - 8,  ct._baseX - (scaledW - CC.w) / 2));
      const targetY = Math.max(8, Math.min(H() - scaledH - 8,  ct._baseY - (scaledH - CC.h) / 2));
      gsap.to(ct.scale, { x: scale, y: scale, duration: 0.18, ease: 'back.out(1.4)' });
      gsap.to(ct, { x: targetX, y: targetY, duration: 0.15 });
    } else {
      if (_hoveredCard === ct) _hoveredCard = null;
      if (ct.parent === _L.fx) _L.cards.addChild(ct);
      const bs = ct._baseScale ?? 1; // opponent board cards live at 0.78
      gsap.to(ct.scale, { x: bs, y: bs, duration: 0.14, ease: 'power2.out' });
      gsap.to(ct, { x: ct._baseX, y: ct._baseY, rotation: ct._baseRot ?? 0, duration: 0.14 });
    }
  }

  // CCG-style hand hover — spreads cards into a flat readable row (like MTG Arena / Hearthstone).
  // On first enter: all cards fan out to evenly-spaced row, no rotation.
  // Hovered card rises and scales slightly.  On leave: debounce then collapse back to arc.
  function _setHandHover(ct, entering) {
    if (_drag) return;
    const pid = ct._owner ?? ct._handPid;
    if (!pid) return;

    if (entering) {
      if (_handCollapseTimer) { clearTimeout(_handCollapseTimer); _handCollapseTimer = null; }
      _handHoverCount++;

      if (_handHoverCount === 1) {
        // Spread all cards to a flat row with clear gaps
        const cards = _hand[pid];
        const n = cards.length;
        if (n === 0) return;
        // Spacing: wide enough to show each card; clamp so they all fit
        const cw = HC.w; // use hero card width as base (widest)
        const spacing = Math.min(cw + (_isCompact() ? 8 : 18), (W() * (_isCompact() ? 0.92 : 0.82)) / n);
        const totalW  = spacing * (n - 1) + cw;
        const startX  = W() / 2 - totalW / 2;
        const flatY   = Math.max(SAFE + 80, Math.min(_handBaseY(), H() - HC.h - _bottomHudClearance()));

        cards.forEach((c, idx) => {
          const tx = startX + idx * spacing;
          c._expandX = tx;
          c._expandY = flatY;
          gsap.killTweensOf(c); gsap.killTweensOf(c.scale);
          gsap.to(c, { x: tx, y: flatY, rotation: 0, duration: 0.28, ease: 'power2.out' });
          gsap.to(c.scale, { x: 1, y: 1, duration: 0.22, ease: 'power2.out' });
        });
      }

      // Raise & scale the individual hovered card.
      // Scale grows from the top-left, so position the card such that the WHOLE
      // zoomed card — including the bottom text box — stays on screen.
      const cw = ct._cardType === 'action' ? AC.w : HC.w;
      const chh = ct._cardType === 'action' ? AC.h : HC.h;
      const hs = _handHoverScale(chh);
      const expandX = ct._expandX ?? ct._baseX;
      const hx = Math.max(8, Math.min(W() - cw * hs - 8, expandX - (cw * (hs - 1)) / 2));
      const hy = Math.max(SAFE + 70, H() - chh * hs - _bottomHudClearance()); // fully visible above the bottom bar
      // Bring to top of hand layer
      if (ct.parent === _L.hand) { _L.hand.removeChild(ct); _L.hand.addChild(ct); }
      gsap.killTweensOf(ct); gsap.killTweensOf(ct.scale);
      gsap.to(ct, { x: hx, y: hy, rotation: 0, duration: 0.16, ease: 'back.out(1.5)' });
      gsap.to(ct.scale, { x: hs, y: hs, duration: 0.16, ease: 'back.out(1.5)' });
      _hoveredCard = ct;

    } else {
      // Return hovered card to flat row position (not back to arc yet)
      if (_hoveredCard === ct) {
        const expandX = ct._expandX ?? ct._baseX;
        const expandY = ct._expandY ?? _handBaseY();
        gsap.killTweensOf(ct); gsap.killTweensOf(ct.scale);
        gsap.to(ct, { x: expandX, y: expandY, rotation: 0, duration: 0.12, ease: 'power2.out' });
        gsap.to(ct.scale, { x: 1, y: 1, duration: 0.12, ease: 'power2.out' });
        _hoveredCard = null;
      }

      _handHoverCount = Math.max(0, _handHoverCount - 1);
      _handCollapseTimer = setTimeout(() => {
        _handCollapseTimer = null;
        if (_handHoverCount === 0) {
          // Collapse back to fan arc
          _hand[pid].forEach(c => {
            gsap.killTweensOf(c); gsap.killTweensOf(c.scale);
            gsap.to(c.scale, { x: 1, y: 1, duration: 0.22, ease: 'power2.out' });
            gsap.to(c, { x: c._baseX, y: c._baseY,
                         rotation: c._baseRot ?? 0, duration: 0.22, ease: 'power2.inOut' });
          });
        }
      }, 90);
    }
  }

  function _dragStart(event, ct) {
    if (_targetMode) return; // let the click bubble to the stage target-picker
    if (ct._owner !== (GameState?.currentTurn ?? 'p1')) return;
    event.stopPropagation();
    // Reset scale/rotation for a clean upright drag, but DRAG FROM WHERE THE CARD
    // CURRENTLY IS. Teleporting to the arc base (the old behaviour) made a hovered
    // card — which has spread far from its base — snap away from the cursor, so the
    // card tracked the pointer with a large wrong offset. That was the "broken drag".
    gsap.killTweensOf(ct); gsap.killTweensOf(ct.scale);
    ct.scale.set(1);
    ct.rotation = 0;
    if (ct.parent === _L.fx)   _L.cards.addChild(ct);
    if (ct.parent === _L.hand) _L.hand.removeChild(ct); // re-parented to drag below
    // Collapse the hand-hover state so the other cards don't stay fanned mid-drag
    _hoveredCard = null;
    _handHoverCount = 0;
    if (_handCollapseTimer) { clearTimeout(_handCollapseTimer); _handCollapseTimer = null; }
    const pos = event.data.global;
    ct.alpha = 0.87;
    const isChar = ct._cardType === 'char';
    _drag = {
      ct, offX: ct.x - pos.x, offY: ct.y - pos.y, isChar,
      t0: performance.now(), px0: pos.x, py0: pos.y, // for click-vs-drag detection
    };
    _L.drag.addChild(ct);
  }

  function _onGlobalMove(event) {
    if (!_drag) return;
    const pos = event.data.global;
    _drag.ct.x = pos.x + _drag.offX;
    _drag.ct.y = pos.y + _drag.offY;

    if (_drag.isChar) {
      // Highlight enemy cards and player icon as attack targets
      const oppPid = _drag.ct._owner === 'p1' ? 'p2' : 'p1';
      _board[oppPid].forEach(c => {
        const hit = _hitTest(pos, c);
        c._frame?.clear();
        c._frame?.lineStyle(3, hit ? 0xff3333 : (c._charData?.currentHp > c._charData?.maxHp/2 ? P.opp : P.warn), 0.9);
        c._frame?.beginFill(P.card);
        c._frame?.drawRoundedRect(0, 0, CC.w, CC.h, 12);
        c._frame?.endFill();
      });
      // Highlight player icon
      if (_playerIcons[oppPid]) {
        _playerIcons[oppPid].alpha = _hitTestIcon(pos, oppPid) ? 1.2 : 0.7;
      }
    } else {
      // Hero deploy — highlight bottom zone (always the active player's deploy zone)
      const inZone = _inZone(pos);
      _L.zones.children.forEach((z, idx) => {
        const isBottomZone = idx === 1; // zones[0]=top(p2), zones[1]=bottom(p1)
        z.alpha = (isBottomZone && inZone) ? 1.0 : 0.55;
      });
    }
  }

  function _cancelDrag() {
    if (!_drag) return;
    const { ct } = _drag;
    _drag = null;
    if (ct) {
      ct.alpha = 1;
      ct.scale.set(1);
    }
    _L.drag.removeChildren();
    _L.zones.children.forEach(z => z.alpha = 0.55);
    render();
  }

  function _onGlobalUp(event) {
    if (!_drag) return;
    const { ct, isChar, t0, px0, py0 } = _drag;
    _drag = null;
    ct.alpha = 1; ct.scale.set(1);
    _L.drag.removeChild(ct);
    _L.zones.children.forEach(z => z.alpha = 0.55);
    // Reset enemy card highlights
    const oppPid = ct._owner === 'p1' ? 'p2' : 'p1';
    if (_playerIcons[oppPid]) _playerIcons[oppPid].alpha = 1.0;

    const pos   = event.data.global;
    const owner = ct._owner;

    // Short press with no movement = a CLICK, not a drag
    const wasClick = (performance.now() - t0 < 350)
      && Math.hypot(pos.x - px0, pos.y - py0) < 8;
    if (wasClick) {
      renderBoard(); // snap everything back to its proper place
      if (isChar) {
        ActionUI?.openCharPanel?.(ct._charData, owner);   // ability panel
      } else if (ct._cardType === 'hero') {
        expandCard?.(ct._cardData, 'hero');               // read the card
      }
      return;
    }

    if (isChar) {
      // Drag-to-attack: check if dropped on enemy char or player icon
      let targetHit = null;
      _board[oppPid].forEach(c => {
        if (_hitTest(pos, c)) targetHit = { type: 'char', char: c._charData };
      });
      if (!targetHit && _hitTestIcon(pos, oppPid)) {
        // Check for taunt — if any enemy has taunt, must target them
        const hasTaunt = _board[oppPid].some(c => c._charData?.statuses?.some?.(s => s.id === 'status_taunt'));
        if (hasTaunt) {
          showToast('Must attack the taunting character!', 'warn');
        } else {
          targetHit = { type: 'player', pid: oppPid };
        }
      }
      // Drop anywhere in the opponent zone also counts as a direct player attack
      if (!targetHit && _inOpponentZone(pos)) {
        const hasTaunt = _board[oppPid].some(c => c._charData?.statuses?.some?.(s => s.id === 'status_taunt'));
        if (hasTaunt) {
          showToast('Must attack the taunting character!', 'warn');
        } else {
          targetHit = { type: 'player', pid: oppPid };
        }
      }
      if (targetHit) {
        _cbs.onAttack?.({ char: ct._charData, owner, target: targetHit });
      }
      renderBoard(); return;
    }

    // Hero deploy
    const card = ct._cardData;
    if (ct._cardType === 'hero' && _inZone(pos)) {
      if (!(PhaseManager?.canDeploy?.())) {
        showToast('Cannot deploy now', 'warn');
      } else if ((GameState?.getMana?.() ?? 0) < (card?.manaCost ?? 0)) {
        showToast('Not enough mana', 'warn');
      } else {
        const r = GameState?.deployHero?.(owner, card.id);
        if (r?.ok) { renderBoard(); return; }
        else showToast(r?.error ?? 'Deploy failed', 'warn');
      }
    }
    renderBoard();
  }

  function _inZone(pos) {
    // Active player always deploys to the BOTTOM zone (ZONE.p1Y)
    const zT = ZONE.p1Y();
    const zH = ZONE.hOwn();
    return pos.y >= zT && pos.y <= zT + zH && pos.x >= W() * 0.12 && pos.x <= W() * 0.88;
  }

  function _inOpponentZone(pos) {
    // Opponent is always at the TOP zone (ZONE.p2Y)
    const zT = ZONE.p2Y();
    const zH = ZONE.hOpp();
    return pos.y >= zT && pos.y <= zT + zH && pos.x >= W() * 0.12 && pos.x <= W() * 0.88;
  }

  // Hit-test a stage-space pointer position against a PixiJS Container's bounds
  function _hitTest(pos, ct) {
    const b = ct.getBounds();
    return pos.x >= b.x && pos.x <= b.x + b.width && pos.y >= b.y && pos.y <= b.y + b.height;
  }

  // Hit-test against a player attack icon
  function _hitTestIcon(pos, pid) {
    const ico = _playerIcons[pid];
    if (!ico) return false;
    const b = ico.getBounds();
    const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
    const dx = pos.x - cx, dy = pos.y - cy;
    return Math.sqrt(dx*dx + dy*dy) < 40;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MANA GAIN ANIMATION
  // ════════════════════════════════════════════════════════════════════════════
  function animateManaGain(amount) {
    if (!_app) return;
    // Defer one frame so render()+updateHUD() finishes snapping dots first,
    // then we reset to empty and play the liquid fill animation.
    requestAnimationFrame(() => {
      const mana = GameState?.getMana?.() ?? 0;

      if (_hud.center?._dots) {
        // Hard-reset all dots to empty so the animation plays from zero
        _hud.center._dots.forEach(dot => {
          gsap.killTweensOf(dot._fill); gsap.killTweensOf(dot._fill.scale);
          dot._fill.alpha = 0; dot._fill.scale.set(0.1);
          if (dot._glow) dot._glow.alpha = 0;
        });
        // Stagger-fill up to current mana
        _hud.center._dots.forEach((dot, i) => {
          if (i >= mana) return;
          const delay = i * 0.09;
          gsap.to(dot._fill,       { alpha: 1, duration: 0.28, delay, ease: 'power2.out' });
          gsap.to(dot._fill.scale, { x: 1, y: 1, duration: 0.32, delay, ease: 'back.out(2.8)' });
          gsap.to(dot._fill.scale, {
            x: 1.35, y: 1.35, duration: 0.12, delay: delay + 0.28,
            yoyo: true, repeat: 1, ease: 'power2.out',
          });
          if (dot._glow) gsap.to(dot._glow, { alpha: 0.85, duration: 0.3, delay });
        });
      }

      // Floating +N MANA text — bottom-left near the health bar, floats upward
      const txt = _T(`+${amount} MANA`, {
        fontFamily: "'Exo 2', sans-serif", fontSize: 20, fontWeight: '900',
        fill: 0xff4400, stroke: 0x000000, strokeThickness: 4,
        dropShadow: true, dropShadowColor: 0x880000, dropShadowBlur: 14, dropShadowAlpha: 0.85,
      });
      txt.anchor.set(0.5);
      txt.x = W() * 0.18; txt.y = H() - 60;
      _L.hud.addChild(txt);
      gsap.to(txt, {
        y: H() - 135, alpha: 0, duration: 1.5, ease: 'power2.out',
        onComplete: () => { if (txt.parent) txt.parent.removeChild(txt); },
      });
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // DICE ROLL — 3D CSS die (HTML overlay, GPU-composited GSAP transforms)
  // ════════════════════════════════════════════════════════════════════════════
  // All motion animates transform (x/y/scale) + opacity ONLY — never top/left/width —
  // so the browser composites it on the GPU instead of reflowing/repainting each frame.
  function showDiceRoll(result, label, onDone) {
    if (!_app) { onDone?.(); return; }

    // Pause the PixiJS render loop during the roll. GSAP drives the dice on the main
    // thread via rAF; if the heavy board keeps rendering every frame it starves those
    // callbacks and the dice stutters. The board is frozen during a roll anyway, so
    // freeing the main thread makes the dice buttery — and is resumed before we're done.
    let _tickerStopped = false;
    const _resumeTicker = () => { if (_tickerStopped) { _tickerStopped = false; try { _app.ticker.start(); } catch (_) {} } };
    try { _app.ticker.stop(); _tickerStopped = true; } catch (_) {}

    let _doneFired = false;
    const _done = () => { if (!_doneFired) { _doneFired = true; _resumeTicker(); onDone?.(); } };

    try {
      const canvas = _app.view;
      const cr     = canvas.getBoundingClientRect();
      const SIZE   = 200; // scene div width/height (px) — large, centre-stage

      // Screen-space rest center & HUD target (the scene's left/top is fixed here once;
      // everything else is a transform delta from this anchor)
      const cx    = cr.left + cr.width  * 0.5;
      const cy    = cr.top  + cr.height * 0.40;
      const scX   = cr.width  / W();
      const scY   = cr.height / H();
      const hudSX = cr.left + HUD_DIE().x * scX; // HUD die center X
      const hudSY = cr.top  + HUD_DIE().y * scY; // HUD die center Y

      // ── Pip grid for each face value ([left%, top%] within the face) ──────────
      const PIPS = {
        1: [[50,50]],
        2: [[30,28],[70,72]],
        3: [[30,22],[50,50],[70,78]],
        4: [[27,27],[73,27],[27,73],[73,73]],
        5: [[27,27],[73,27],[50,50],[27,73],[73,73]],
        6: [[27,20],[73,20],[27,50],[73,50],[27,80],[73,80]],
      };

      // ── Build HTML overlay ────────────────────────────────────────────────────
      const overlay = document.createElement('div');
      overlay.id = 'dice-3d-overlay';
      document.body.appendChild(overlay);

      // FAILSAFE: GSAP tweens run on rAF, which pauses in hidden/background tabs.
      // If the fly-to-HUD tween never completes, the overlay would cover the game
      // forever and onDone would never fire. Force-finish after the full timeline.
      setTimeout(() => {
        if (!_doneFired) {
          try { overlay.remove(); } catch (_) {}
          const hudDc = _hud.center?._diceContainer;
          if (hudDc) _updateDicePips(hudDc, result);
          _done();
        }
      }, 3400);

      // Spotlight: static radial gradient; only its opacity tweens (composited)
      const spot = document.createElement('div');
      spot.className = 'dice-3d-spotlight';
      spot.style.cssText = `
        background: radial-gradient(ellipse 210px 230px at ${cx}px ${cy}px,
          transparent 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.94) 72%);
        opacity: 0;`;
      overlay.appendChild(spot);

      // Scene — perspective container. left/top pin it to the rest center ONCE;
      // GSAP then animates x/y (translate) + scale only.
      const scene = document.createElement('div');
      scene.className = 'dice-3d-scene';
      scene.style.left = `${cx - SIZE / 2}px`;
      scene.style.top  = `${cy - SIZE / 2}px`;
      overlay.appendChild(scene);

      // Cube — 3D rotation + squash target
      const cube = document.createElement('div');
      cube.className = 'dice-3d-cube';
      scene.appendChild(cube);

      // 6 faces
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

      // Result block — structured, punchy readout (not a sentence).
      // `label` may be a legacy string or { name, roll, mana, damage }.
      const info = (typeof label === 'object' && label !== null) ? label : null;
      const lbl = document.createElement('div');
      lbl.className = 'dice-3d-label';
      if (info) {
        lbl.innerHTML = `
          <div class="dr-name">${info.name ?? ''} ROLLED</div>
          <div class="dr-mana">+${info.mana ?? info.roll} MANA</div>
          ${info.damage ? `<div class="dr-dmg">−${info.damage} HP</div>` : ''}`;
      } else {
        lbl.textContent = label ?? '';
      }
      lbl.style.left = `${cx}px`;
      lbl.style.top  = `${cy + SIZE * 0.72}px`;
      overlay.appendChild(lbl);
      gsap.set(lbl, { xPercent: -50 }); // horizontal centering via transform, not the layout

      // ── Target cube rotation to land on the correct face ─────────────────────
      const FACE_ROT = {
        1: { rx:   0, ry:   0 },
        2: { rx:   0, ry: -90 },
        3: { rx:  90, ry:   0 },
        4: { rx: -90, ry:   0 },
        5: { rx:   0, ry:  90 },
        6: { rx:   0, ry: 180 },
      };
      const tgt = FACE_ROT[result] ?? { rx: 0, ry: 0 };

      // Random extra spins (whole turns, so they don't change the final face)
      const spinX = (Math.floor(Math.random() * 3) + 3) * 360;
      const spinY = (Math.floor(Math.random() * 3) + 3) * 360;
      const spinZ = (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 2) + 1) * 360;

      // ── Animate (transforms only) ──────────────────────────────────────────────
      const dropFrom = -(cy + SIZE);            // start well above the viewport
      const drift    = (Math.random() - 0.5) * 80; // horizontal wobble on the way down

      gsap.set(scene, { x: drift, y: dropFrom });
      gsap.to(spot, { opacity: 1, duration: 0.42, ease: 'power2.out' });

      // Drop with bounce (translateY) + drift settling back to center (translateX)
      gsap.to(scene, { y: 0, duration: 0.62, ease: 'bounce.out' });
      gsap.to(scene, { x: 0, duration: 0.46, delay: 0.18, ease: 'back.out(2.2)' });

      // Wild 3D tumble → settles showing the correct face. power4 front-loads the
      // spin so rotation is visually DONE when the bounce lands (no lazy creep).
      gsap.to(cube, {
        rotationX: tgt.rx + spinX,
        rotationY: tgt.ry + spinY,
        rotationZ: spinZ,
        duration: 0.90, ease: 'power4.out',
        onComplete: () => {
          // Lock the exact final orientation — belt-and-braces face guarantee
          gsap.set(cube, { rotationX: tgt.rx, rotationY: tgt.ry, rotationZ: 0 });
          // Squash-and-stretch on the SCENE (screen space). Squashing the rotated
          // cube deformed along a different 3D axis per face — THAT was the
          // "inconsistent" landing: flat squash one roll, depth-stretch the next.
          gsap.to(scene, { scaleX: 1.22, scaleY: 0.78, duration: 0.08, ease: 'power2.in',
            onComplete: () => gsap.to(scene, { scaleX: 1, scaleY: 1, duration: 0.5, ease: 'back.out(4)' })
          });
          if (result === 6) {
            // ends before the fly-to-HUD tween takes over the scene's scale
            gsap.to(scene, { scale: 1.12, duration: 0.1, yoyo: true, repeat: 5, delay: 0.15 });
          }
          // Result block slams in with a scale punch
          gsap.fromTo(lbl,
            { opacity: 0, scale: 0.3, y: 18 },
            { opacity: 1, scale: 1, y: 0, duration: 0.34, delay: 0.10, ease: 'back.out(2.2)' });
          const dmgEl = lbl.querySelector('.dr-dmg');
          if (dmgEl) { // damage line gets an angry shake
            gsap.fromTo(dmgEl, { x: -7 }, { x: 7, duration: 0.05, yoyo: true, repeat: 7, delay: 0.4,
              onComplete: () => gsap.set(dmgEl, { x: 0 }) });
          }
        }
      });

      // ── Fly to HUD (translate + scale) after the result registers ─────────────
      setTimeout(() => {
        // The centre-stage spin is over; resume the board so it (and the HUD punch
        // below) renders again as the die flies to the corner.
        _resumeTicker();
        const smallScale = 54 / SIZE;
        gsap.to(lbl, { opacity: 0, duration: 0.28 });
        // Fade the die out DURING the flight so it never reads as clipping
        // through the buttons/HUD it passes over — the canvas HUD die "catches"
        // the roll with its punch animation instead.
        gsap.to(scene, { opacity: 0, duration: 0.30, delay: 0.22, ease: 'power1.in' });
        gsap.to(scene, {
          x: hudSX - cx,
          y: hudSY - cy,
          scale: smallScale,
          duration: 0.52, ease: 'power2.inOut',
          onComplete: () => {
            // Punch the PixiJS HUD die so the value lands there
            const hudDc = _hud.center?._diceContainer;
            if (hudDc) {
              _updateDicePips(hudDc, result);
              gsap.to(hudDc.scale, { x: 1.4, y: 1.4, duration: 0.12, ease: 'power2.out',
                onComplete: () => gsap.to(hudDc.scale, { x: 1, y: 1, duration: 0.25, ease: 'back.out(3)' })
              });
            }
            gsap.to(spot,  { opacity: 0, duration: 0.32 });
            gsap.to(scene, { opacity: 0, duration: 0.22,
              onComplete: () => { overlay.remove(); _done(); }
            });
          }
        });
      }, 1700);

    } catch (err) {
      console.error('[showDiceRoll] error:', err);
      _done();
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // HIT EFFECT — floating damage number + flash
  // ════════════════════════════════════════════════════════════════════════════
  function showHitEffect(targetType, targetId, damage) {
    if (!_app) return;
    let x = W() / 2, y = H() / 2;

    if (targetType === 'player') {
      // Player HP position (top seat panel = opponent, bottom bar = active player)
      const activePid = GameState?.currentTurn ?? 'p1';
      const isOpp = targetId !== activePid;
      y = isOpp ? SAFE + 27 : H() - SAFE - 21;
      x = isOpp ? W() / 2 : W() * 0.34;
    } else if (targetType === 'character') {
      const owner = GameState?.getCharacterOwner?.(targetId);
      if (owner) {
        const charCt = _board[owner]?.find(c => c._charData?.instanceId === targetId);
        if (charCt) {
          const b = charCt.getBounds();
          x = b.x + b.width  / 2;
          y = b.y + b.height / 2;
        }
      }
    }

    // Use _L.effects (never wiped by render()) so the animation survives the next renderBoard() call
    const flash = new PIXI.Graphics();
    flash.beginFill(0xff2200, 0.72);
    flash.drawCircle(x, y, 46);
    flash.endFill();
    _L.effects.addChild(flash);
    gsap.to(flash, { alpha: 0, duration: 0.28, ease: 'power3.out',
      onComplete: () => { if (flash.parent) flash.parent.removeChild(flash); }
    });

    // Damage number
    const dmg = _T(`-${damage}`, {
      fontFamily: "'Exo 2', sans-serif", fontSize: 34, fontWeight: '900',
      fill: 0xff2200, stroke: 0x000000, strokeThickness: 5,
      dropShadow: true, dropShadowColor: 0x880000, dropShadowBlur: 14, dropShadowAlpha: 0.9,
    });
    dmg.anchor.set(0.5);
    dmg.position.set(x, y);
    dmg.alpha = 0; dmg.scale.set(0.3);
    _L.effects.addChild(dmg);
    gsap.to(dmg,       { alpha: 1, duration: 0.08 });
    gsap.to(dmg.scale, { x: 1.1, y: 1.1, duration: 0.18, ease: 'back.out(2.5)' });
    gsap.to(dmg, { y: y - 72, alpha: 0, duration: 0.82, delay: 0.22, ease: 'power2.out',
      onComplete: () => { if (dmg.parent) dmg.parent.removeChild(dmg); }
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PLAYER ATTACK ICONS
  // ════════════════════════════════════════════════════════════════════════════
  function _buildPlayerIcons() {
    const activePid = GameState?.currentTurn ?? 'p1';
    // Skip rebuild if already built for this player's turn
    if (_iconsBuiltTurn === activePid && _playerIcons.p1 && _playerIcons.p2) return;
    _iconsBuiltTurn = activePid;

    // Remove old icons from HUD layer
    ['p1','p2'].forEach(pid => {
      if (_playerIcons[pid]) _L.hud.removeChild(_playerIcons[pid]);
    });
    _playerIcons = {};
    ['p1','p2'].forEach(pid => {
      const col      = 0xff2200; // hellfire — same for both, it's demonic
      const isActive = pid === activePid;
      // Active player's icon at BOTTOM zone; inactive (opponent) icon at TOP zone
      const zCY = isActive ? ZONE.p1Y() + ZONE.hOwn() / 2 : ZONE.p2Y() + ZONE.hOpp() / 2;
      const zoneLeft = W() / 2 - ZONE.w() / 2;
      const ix  = _isNarrow()
        ? Math.max(SAFE + 30, zoneLeft - 34)
        : Math.max(SAFE + 44, zoneLeft / 2);
      const iy  = zCY;

      const ct = new PIXI.Container();
      ct.position.set(ix, iy);

      // Glow ring
      const glow = new PIXI.Graphics();
      for (let r = 38; r >= 22; r -= 4) {
        glow.beginFill(col, ((38 - r) / 38) * 0.18);
        glow.drawCircle(0, 0, r);
        glow.endFill();
      }
      ct.addChild(glow);

      // Circle body
      const body = new PIXI.Graphics();
      body.lineStyle(3, col, 0.9);
      body.beginFill(0x060412, 0.94);
      body.drawCircle(0, 0, 22);
      body.endFill();
      ct.addChild(body);

      // Player number label
      const lbl = _T(pid === 'p1' ? 'P1' : 'P2', {
        fontFamily: "'Exo 2', sans-serif", fontSize: 12, fontWeight: '900', fill: col,
      });
      lbl.anchor.set(0.5); ct.addChild(lbl);

      // Target reticle hint (drawn — the old ⚔ glyph rendered as an 'X' box)
      const ret = new PIXI.Graphics();
      ret.lineStyle(1.5, 0x995555, 0.9);
      ret.drawCircle(0, 0, 5);
      ret.moveTo(-8, 0); ret.lineTo(-3, 0);
      ret.moveTo(3, 0);  ret.lineTo(8, 0);
      ret.moveTo(0, -8); ret.lineTo(0, -3);
      ret.moveTo(0, 3);  ret.lineTo(0, 8);
      ret.position.set(0, 34);
      ct.addChild(ret);

      // Tooltip text
      const tip = _T('drop here to\nattack player', {
        fontFamily: "'Rajdhani', sans-serif", fontSize: 7, fill: 0x775555, align: 'center',
      });
      tip.anchor.set(0.5, 0); tip.position.set(0, 44); ct.addChild(tip);

      ct.interactive = false; // icons are drop targets, not click targets
      _L.hud.addChild(ct);
      _playerIcons[pid] = ct;
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PASS-AND-PLAY TURN FLIP
  // ════════════════════════════════════════════════════════════════════════════
  function _applyTurnFlip() {
    const turn = GameState?.currentTurn ?? 'p1';
    if (turn === _lastFlippedTurn) return;
    _lastFlippedTurn = turn;

    // Ensure stage is always upright (no rotation carried over from old code)
    _app.stage.rotation = 0;
    _app.stage.x = 0;
    _app.stage.y = 0;

    // HTML buttons are CSS-positioned (right side) — just clear any inline transform
    const ga = document.getElementById('game-actions');
    if (ga) {
      const bottomDock = window.matchMedia?.('(max-width: 900px), (pointer: coarse)')?.matches;
      ga.style.transition = '';
      ga.style.transform = bottomDock ? 'translateX(-50%)' : 'translateY(-50%)';
    }

    // CSS flip: instantly collapse canvas to a flat line, then expand to reveal new layout
    const el = _app?.view?.parentElement;
    if (el) {
      el.style.transition    = 'none';
      el.style.transform     = 'scaleY(0)';
      el.style.transformOrigin = '50% 50%';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.transition = 'transform 0.60s cubic-bezier(0.18, 0, 0.28, 1.30)';
          el.style.transform  = 'scaleY(1)';
        });
      });
    }

    // Turn-change announcement (shows after the board expands back in)
    _showTurnAnnouncement(turn);
  }

  function _showTurnAnnouncement(pid) {
    const name  = GameState?.getPlayerLabel?.(pid) ?? (pid === 'p1' ? 'Player 1' : 'Player 2');
    const label = `${name.toUpperCase()}'S TURN`;
    const col   = 0xff3300; // hellfire red for both — it's Death Dice
    const txt = _T(label, {
      fontFamily: "'Exo 2', sans-serif", fontSize: 30, fontWeight: '900',
      fill: col, stroke: 0x000000, strokeThickness: 6,
      dropShadow: true, dropShadowBlur: 28, dropShadowColor: 0x880000, dropShadowAlpha: 0.9,
    });
    txt.anchor.set(0.5);
    txt.position.set(W() / 2, H() / 2);
    txt.alpha = 0; txt.scale.set(0.3);
    _L.fx.addChild(txt);
    gsap.to(txt,       { alpha: 1, duration: 0.22, delay: 0.30 });
    gsap.to(txt.scale, { x: 1, y: 1, duration: 0.28, delay: 0.30, ease: 'back.out(1.8)' });
    gsap.to(txt,       { alpha: 0, duration: 0.40, delay: 1.35,
      onComplete: () => { if (txt.parent) txt.parent.removeChild(txt); },
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ════════════════════════════════════════════════════════════════════════════
  function _parseName(card) {
    return card.name
      || (card.imageAsset
        ? card.imageAsset.replace(/^DD_/i,'').replace(/\.(png|jpg)$/i,'').replace(/_/g,' ')
        : '?');
  }

  /** Look up passive + ability names for a card from CHARACTER_ABILITIES or card data */
  function _getCardAbilities(card) {
    if (!card) return {};
    const passiveOnly = /^(Passive|Durability)$/i.test(card.classType ?? '');
    const key = (card.name ?? '').toLowerCase().trim();
    const lookup = (typeof CHARACTER_ABILITIES !== 'undefined') ? CHARACTER_ABILITIES[key] : null;
    if (lookup) {
      return {
        ...lookup,
        ability1: passiveOnly ? null : lookup.ability1,
        ability2: passiveOnly ? null : lookup.ability2,
        passive: lookup.passive ?? card.passives?.[0]?.name ?? null,
      };
    }
    // Fallback to inline card data
    return {
      passive:  card.passives?.[0]?.name   ?? null,
      ability1: passiveOnly ? null : (card.abilities?.[0]?.abilityName ?? null),
      ability2: passiveOnly ? null : (card.abilities?.[1]?.abilityName ?? null),
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PUBLIC: render()
  // ════════════════════════════════════════════════════════════════════════════
  function render() {
    if (!_app) return;
    _syncLayoutMetrics();

    // A re-render means game state changed under the target picker — cancel it
    // (stale highlights/callbacks would reference destroyed card containers)
    if (_targetMode) {
      const tm = _targetMode;
      exitTargetMode();
      ActionUI?.hideTargetBanner?.();
      tm.onPick?.(null);
    }

    _buildBg();
    _buildZones();
    // HUD is built once in init() and on resize — don't rebuild every render
    // (rebuilding destroys the mana gauge and kills in-flight GSAP animations)
    _repositionHUD();
    _buildPlayerIcons();

    // Drop any hover-elevated card back to cards layer before wiping it
    if (_hoveredCard) {
      gsap.killTweensOf(_hoveredCard); gsap.killTweensOf(_hoveredCard.scale);
      _hoveredCard.scale.set(1);
      if (_hoveredCard.parent === _L.fx) _L.cards.addChild(_hoveredCard);
      _hoveredCard = null;
    }
    _L.fx.removeChildren(); // clear stale effects (announcements, old fx)

    _L.oppHand.removeChildren();
    _L.cards.removeChildren();
    _L.hand.removeChildren();
    _L.drag.removeChildren();
    _hand  = { p1: [], p2: [] };
    _board = { p1: [], p2: [] };
    // Boards first (lower layer), then all hands on top
    for (const pid of ['p1', 'p2']) _layoutBoard(pid);
    for (const pid of ['p1', 'p2']) _layoutHand(pid);
    _updateHUD();
    _applyTurnFlip();
  }

  return { init, render, animateManaGain, showDiceRoll, showHitEffect,
           enterTargetMode, exitTargetMode };
})();
