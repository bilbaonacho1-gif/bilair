import { useMemo, useState } from 'react';
import type { Media } from '../data/types';

type Tone = 'dark' | 'paper' | 'stone';

interface Props {
  media: Media;
  /** Texto grande del placeholder, ej. código IATA */
  code?: string;
  coords?: string;
  tone?: Tone;
  className?: string;
  sizes?: string;
  priority?: boolean;
}

function seeded(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** Curvas de nivel generadas a partir de un texto: cada ciudad tiene su propio "mapa". */
function contours(seed: string) {
  const rnd = seeded(seed);
  const cx = 30 + rnd() * 40;
  const cy = 30 + rnd() * 40;
  const phases = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28];
  const paths: string[] = [];
  for (let k = 1; k <= 14; k++) {
    const base = k * 7.5;
    const pts: string[] = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      const r = base * (1 + 0.16 * Math.sin(3 * a + phases[0] + k * 0.2) + 0.09 * Math.sin(5 * a + phases[1]) + 0.05 * Math.sin(9 * a + phases[2] - k * 0.3));
      pts.push(`${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r * 0.82).toFixed(1)}`);
    }
    paths.push(`M${pts.join('L')}Z`);
  }
  return paths;
}

export function Photo({ media, code, coords, tone = 'stone', className = '', sizes, priority }: Props) {
  const [failed, setFailed] = useState(false);
  const lines = useMemo(() => contours(media.alt + (code ?? '')), [media.alt, code]);

  if (media.src && !failed) {
    return (
      <figure className={`photo ${className}`}>
        <img src={media.src} alt={media.alt} sizes={sizes} loading={priority ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)} />
        {media.credit && <figcaption className="photo__credit mono">{media.credit}</figcaption>}
      </figure>
    );
  }

  return (
    <figure className={`photo photo--placeholder photo--${tone} ${className}`} role="img" aria-label={`${media.alt} (foto pendiente)`}>
      <svg className="photo__map" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {lines.map((d, i) => (
          <path key={i} d={d} fill="none" strokeWidth={i % 4 === 0 ? 1.1 : 0.6} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      {code && (
        <span className="photo__code display" aria-hidden="true">
          {code}
        </span>
      )}
      <figcaption className="photo__meta mono">
        <span>{media.alt}</span>
        {coords && <span>{coords}</span>}
      </figcaption>
      {media.provisional !== false && <span className="photo__pending tag tag--demo">Foto pendiente</span>}
    </figure>
  );
}

export function formatCoords(lat: number, lon: number) {
  const f = (v: number, p: string, n: string) => `${Math.abs(v).toFixed(4)}° ${v >= 0 ? p : n}`;
  return `${f(lat, 'N', 'S')} · ${f(lon, 'E', 'O')}`;
}
