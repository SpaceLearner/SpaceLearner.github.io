// Select a stable asset tier once, including phones first opened in landscape.
const media = query => typeof matchMedia === 'function' && matchMedia(query).matches;
const compact = media('(max-width:699px)') ||
  (media('(pointer:coarse)') && Math.min(innerWidth, innerHeight) < 700);
const constrained = !!navigator.connection?.saveData ||
  (navigator.deviceMemory > 0 && navigator.deviceMemory <= 4) ||
  (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4);
export const quality = Object.freeze({
  compact, constrained, textureTier: compact || constrained ? 'compact' : 'full',
  fps: compact || constrained ? 30 : 60,
  // Ambient-only frames (Earth, station, clouds) move slowly; render them less often.
  ambientFps: compact || constrained ? 20 : 30,
  skyPixels: compact || constrained ? 800000 : 1600000,
  pixelRatio(width, height, entering = false) {
    const cap = constrained ? 1.25 : compact ? 1.6 : entering ? 1.5 : 1.7;
    const budget = compact || constrained ? 1200000 : 2200000;
    return Math.min(devicePixelRatio || 1, cap, Math.sqrt(budget / Math.max(1, width * height)));
  }
});
