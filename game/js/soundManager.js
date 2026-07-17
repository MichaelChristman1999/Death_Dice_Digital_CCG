// Simple browser audio bridge for game sound effects.
const SoundManager = (() => {
  const BASE = 'assets/sounds/soundfx/';
  const CLIPS = {
    diceRoll: [
      'GameDiceRoll_S011SP.192.wav',
      'FF_IG_foley_dice_roll_hard_extra.wav',
      'Dice Being Rolled On A Wooden Table.wav',
    ],
  };

  let _enabled = true;
  let _volume = 0.55;
  let _initialized = false;
  const _pool = new Map();

  function init() {
    if (_initialized || typeof window === 'undefined' || typeof Audio === 'undefined') return;
    _initialized = true;
    Object.values(CLIPS).flat().forEach(file => _getAudio(file));

    const unlock = () => {
      const audio = _getAudio(CLIPS.diceRoll[0]);
      const previousMuted = audio.muted;
      audio.muted = true;
      audio.play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
        })
        .catch(() => {})
        .finally(() => { audio.muted = previousMuted; });
    };

    window.addEventListener('pointerdown', unlock, { once: true, capture: true });
    window.addEventListener('keydown', unlock, { once: true, capture: true });
  }

  function play(name) {
    if (!_enabled || typeof Audio === 'undefined') return false;
    const files = CLIPS[name] ?? [];
    if (!files.length) return false;

    const file = files[Math.floor(Math.random() * files.length)];
    const audio = _getAudio(file);
    audio.pause();
    audio.currentTime = 0;
    audio.volume = _volume;
    const promise = audio.play();
    if (promise?.catch) promise.catch(() => {});
    return true;
  }

  function _getAudio(file) {
    let audio = _pool.get(file);
    if (!audio) {
      audio = new Audio(encodeURI(BASE + file));
      audio.preload = 'auto';
      audio.volume = _volume;
      _pool.set(file, audio);
    }
    return audio;
  }

  function setEnabled(enabled) {
    _enabled = enabled !== false;
  }

  function setVolume(volume) {
    _volume = Math.max(0, Math.min(1, Number(volume) || 0));
    _pool.forEach(audio => { audio.volume = _volume; });
  }

  return { init, play, setEnabled, setVolume };
})();
