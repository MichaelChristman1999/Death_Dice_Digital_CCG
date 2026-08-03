window.DeathDiceAssets = (() => {
  const HERO_BASE = 'assets/cards/DD Character V7/';
  const HERO_IMAGE_ALIASES = {
    'DD_Lassquatch.png': 'DD_Lass-Squatch.png',
    'DD_Lassquach.png': 'DD_Lass-Squatch.png',
    'DD_Lass_Squatch.png': 'DD_Lass-Squatch.png',
    'DD_Lass-Squatch.png': 'DD_Lass-Squatch.png',
    'DD_BuzzKill.png': 'DD_Buzz-Kill.png',
    'DD_Buzz_Kill.png': 'DD_Buzz-Kill.png',
    'DD_Buzz-Kill.png': 'DD_Buzz-Kill.png',
  };

  function _fileName(value) {
    return String(value ?? '').trim().split(/[\\/]/).pop();
  }

  function _addUnique(list, value) {
    const clean = _fileName(value);
    if (clean && !list.includes(clean)) list.push(clean);
  }

  function _assetFromName(name) {
    const clean = String(name ?? '')
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^A-Za-z0-9_.()-]/g, '');
    return clean ? `DD_${clean}.png` : '';
  }

  function _encodePath(path) {
    return String(path).split('/').map(encodeURIComponent).join('/');
  }

  function _escapeAttr(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function heroImageCandidates(cardOrAsset) {
    const card = typeof cardOrAsset === 'object' ? cardOrAsset : null;
    const asset = card ? card.imageAsset : cardOrAsset;
    const name = card?.name;
    const candidates = [];
    const assetFile = _fileName(asset);

    if (assetFile) {
      _addUnique(candidates, HERO_IMAGE_ALIASES[assetFile] ?? assetFile);
      _addUnique(candidates, assetFile);
    }

    const namedAsset = _assetFromName(name);
    if (namedAsset) {
      _addUnique(candidates, HERO_IMAGE_ALIASES[namedAsset] ?? namedAsset);
      _addUnique(candidates, namedAsset);
    }

    return candidates;
  }

  function heroImagePaths(cardOrAsset) {
    return heroImageCandidates(cardOrAsset).map(asset => HERO_BASE + _encodePath(asset));
  }

  function heroImagePath(cardOrAsset) {
    return heroImagePaths(cardOrAsset)[0] ?? '';
  }

  function useNextImageFallback(img) {
    const queue = String(img?.dataset?.fallbackSrc ?? '').split('|').filter(Boolean);
    const next = queue.shift();
    if (!next) {
      if (img) img.onerror = null;
      return false;
    }
    img.dataset.fallbackSrc = queue.join('|');
    img.src = next;
    return true;
  }

  function heroImageHtml(cardOrAsset, alt = 'Hero', emptyHtml = '') {
    const paths = heroImagePaths(cardOrAsset);
    if (!paths.length) return emptyHtml;
    const fallback = paths.slice(1).join('|');
    const fallbackAttrs = fallback
      ? ` data-fallback-src="${_escapeAttr(fallback)}" onerror="DeathDiceAssets.useNextImageFallback(this)"`
      : '';
    return `<img src="${_escapeAttr(paths[0])}" alt="${_escapeAttr(alt)}"${fallbackAttrs}>`;
  }

  return {
    heroImageCandidates,
    heroImagePath,
    heroImagePaths,
    heroImageHtml,
    useNextImageFallback,
  };
})();
