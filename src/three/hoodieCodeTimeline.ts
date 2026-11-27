/** Tiempos del comercial "Hoodie Code", en segundos desde el swipe. Archivo liviano: lo usa la UI sin cargar three. */
export const CUTS = {
  swipeOut: 0.55,
  inStart: 0.3,
  oversized: 1.3,
  street: 2.3,
  iconic: 3.3,
  split: 4.3,
  macro: 5.9,
  detail: 6.7,
  whip: 7.4,
  hero: 7.8,
  hold: 9.5,
  end: 10,
};

export type SpotPhase = 'idle' | 'swipe' | 'oversized' | 'street' | 'iconic' | 'split' | 'macro' | 'detail' | 'whip' | 'hero' | 'end';

export function phaseAt(t: number): SpotPhase {
  if (t >= CUTS.end) return 'end';
  if (t >= CUTS.hero) return 'hero';
  if (t >= CUTS.whip) return 'whip';
  if (t >= CUTS.detail) return 'detail';
  if (t >= CUTS.macro) return 'macro';
  if (t >= CUTS.split) return 'split';
  if (t >= CUTS.iconic) return 'iconic';
  if (t >= CUTS.street) return 'street';
  if (t >= CUTS.oversized) return 'oversized';
  return 'swipe';
}
