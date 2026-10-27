import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { geoGraticule10, geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import world from 'world-atlas/countries-110m.json';
import { destinations, statusLabel } from '../data/destinations';
import { getDrop } from '../data/drops';
import type { Destination } from '../data/types';
import { Photo, formatCoords } from './Photo';

const W = 1000;
const H = 520;
const MIN_K = 1;
const MAX_K = 6;

const topo = world as unknown as Topology<{ countries: GeometryCollection }>;
const projection = geoNaturalEarth1().fitExtent(
  [
    [10, 10],
    [W - 10, H - 10],
  ],
  { type: 'Sphere' },
);
const path = geoPath(projection);
const landPath = path(feature(topo, topo.objects.countries)) ?? '';
const borderPath = path(mesh(topo, topo.objects.countries, (a, b) => a !== b)) ?? '';
const graticulePath = path(geoGraticule10()) ?? '';
const spherePath = path({ type: 'Sphere' }) ?? '';

const pos = (d: Destination) => projection([d.lon, d.lat]) ?? [0, 0];

/** Arco de vuelo entre dos puntos proyectados */
function arc(a: [number, number], b: [number, number]) {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2 - Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.28;
  return `M${a[0]},${a[1]} Q${mx},${my} ${b[0]},${b[1]}`;
}

interface View {
  k: number;
  x: number;
  y: number;
}

function clampView(v: View): View {
  const k = Math.min(MAX_K, Math.max(MIN_K, v.k));
  const minX = W - W * k;
  const minY = H - H * k;
  return { k, x: Math.min(0, Math.max(minX, v.x)), y: Math.min(0, Math.max(minY, v.y)) };
}

export function WorldMap({ onVote }: { onVote: (id: string) => void }) {
  const [selectedId, setSelectedId] = useState<string>('buenos-aires');
  const [view, setView] = useState<View>({ k: 1, x: 0, y: 0 });
  const [hint, setHint] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number; moved: boolean } | null>(null);

  const selected = destinations.find((d) => d.id === selectedId) ?? destinations[0];
  const origin = destinations[0];
  const routes = useMemo(() => destinations.filter((d) => d.status === 'next' || (d.status === 'available' && d.id !== origin.id)), [origin.id]);

  /** Convierte coordenadas de pantalla al sistema del SVG */
  const toSvg = useCallback((clientX: number, clientY: number) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: ((clientX - r.left) / r.width) * W, y: ((clientY - r.top) / r.height) * H };
  }, []);

  const zoomAt = useCallback((factor: number, cx = W / 2, cy = H / 2) => {
    setView((v) => {
      const k = Math.min(MAX_K, Math.max(MIN_K, v.k * factor));
      const f = k / v.k;
      return clampView({ k, x: cx - (cx - v.x) * f, y: cy - (cy - v.y) * f });
    });
  }, []);

  const focus = useCallback((d: Destination) => {
    const [px, py] = pos(d);
    setView((v) => {
      const k = Math.max(v.k, 2.2);
      return clampView({ k, x: W / 2 - px * k, y: H / 2 - py * k });
    });
  }, []);

  // Rueda: zoom solo con Ctrl/⌘ para no secuestrar el scroll de la página
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    let t = 0;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) {
        setHint(true);
        window.clearTimeout(t);
        t = window.setTimeout(() => setHint(false), 1400);
        return;
      }
      e.preventDefault();
      const p = toSvg(e.clientX, e.clientY);
      zoomAt(Math.exp(-e.deltaY * 0.004), p.x, p.y);
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [toSvg, zoomAt]);

  const onPointerDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    gesture.current = { dist: 0, moved: false };
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current.dist = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev || !gesture.current) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, cur);
    const r = svgRef.current!.getBoundingClientRect();
    if (pointers.current.size === 1) {
      const dx = ((cur.x - prev.x) / r.width) * W;
      const dy = ((cur.y - prev.y) / r.height) * H;
      if (Math.abs(dx) + Math.abs(dy) > 0.5) {
        if (!gesture.current.moved) (e.currentTarget as Element).setPointerCapture(e.pointerId);
        gesture.current.moved = true;
      }
      setView((v) => clampView({ ...v, x: v.x + dx, y: v.y + dy }));
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (gesture.current.dist) {
        const mid = toSvg((a.x + b.x) / 2, (a.y + b.y) / 2);
        zoomAt(dist / gesture.current.dist, mid.x, mid.y);
      }
      gesture.current.dist = dist;
      gesture.current.moved = true;
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) window.setTimeout(() => (gesture.current = null), 0);
  };

  const select = (d: Destination) => {
    if (gesture.current?.moved) return;
    setSelectedId(d.id);
    focus(d);
  };

  const drop = selected.dropId ? getDrop(selected.dropId) : undefined;
  const markerScale = 1 / Math.sqrt(view.k);

  return (
    <div className="map">
      <div className="map__stage">
        <svg
          ref={svgRef}
          className="map__svg"
          viewBox={`0 0 ${W} ${H}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          role="application"
          aria-label="Mapa de destinos BILAIR. Usá la lista de destinos para navegar con teclado."
        >
          <defs>
            <pattern id="map-dots" width="4" height="4" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="0.8" fill="var(--carbon)" opacity="0.28" />
            </pattern>
          </defs>
          <g
            transform={`translate(${view.x} ${view.y}) scale(${view.k})`}
            style={{ transition: gesture.current?.moved ? 'none' : 'transform .7s var(--ease-out)' }}
          >
            <path d={spherePath} className="map__sphere" />
            <path d={graticulePath} className="map__graticule" vectorEffect="non-scaling-stroke" />
            <path d={landPath} className="map__land" />
            <path d={landPath} fill="url(#map-dots)" />
            <path d={borderPath} className="map__borders" vectorEffect="non-scaling-stroke" />

            {routes.map((d) => (
              <path key={d.id} d={arc(pos(origin) as [number, number], pos(d) as [number, number])} className="map__route" vectorEffect="non-scaling-stroke" />
            ))}

            {destinations.map((d) => {
              const [x, y] = pos(d);
              const active = d.id === selectedId;
              return (
                <g
                  key={d.id}
                  className={`marker marker--${d.status} ${active ? 'is-active' : ''}`}
                  transform={`translate(${x} ${y}) scale(${markerScale})`}
                  onClick={() => select(d)}
                  role="button"
                  aria-label={`${d.city}, ${statusLabel[d.status]}`}
                  tabIndex={-1}
                >
                  <circle r="16" className="marker__hit" />
                  {d.status === 'available' && <circle r="10" className="marker__pulse" />}
                  <circle r={d.status === 'locked' ? 3.2 : 5} className="marker__dot" />
                  <g className="marker__label" transform="translate(9 -9)">
                    <rect x="-2" y="-9" width={d.code.length * 7.4 + 8} height="13" />
                    <text x="2" y="1">
                      {d.code}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        </svg>

        <div className="map__controls">
          <button onClick={() => zoomAt(1.5)} aria-label="Acercar">
            +
          </button>
          <button onClick={() => zoomAt(1 / 1.5)} aria-label="Alejar">
            −
          </button>
          <button onClick={() => setView({ k: 1, x: 0, y: 0 })} aria-label="Ver el mundo completo" className="mono">
            ⤢
          </button>
        </div>
        <div className="map__legend mono" aria-hidden="true">
          {(['available', 'next', 'voting', 'locked'] as const).map((s) => (
            <span key={s} className={`legend legend--${s}`}>
              <i /> {statusLabel[s]}
            </span>
          ))}
        </div>
        <p className={`map__hint mono ${hint ? 'is-on' : ''}`} aria-hidden="true">
          Ctrl + scroll para hacer zoom · arrastrá para moverte
        </p>
      </div>

      <div className="map__side">
        <AnimatePresence mode="wait">
          <motion.article
            key={selected.id}
            className="dest-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            aria-live="polite"
          >
            <Photo
              media={selected.photo}
              code={selected.code}
              coords={formatCoords(selected.lat, selected.lon)}
              tone={selected.status === 'locked' ? 'stone' : 'dark'}
              className="dest-card__photo"
            />
            <div className="dest-card__body">
              <div className="dest-card__top">
                <span className={`tag status status--${selected.status}`}>
                  <span className="dot" /> {statusLabel[selected.status]}
                </span>
                <span className="mono">{selected.code}</span>
              </div>
              <h3 className="display h-md">{selected.city}</h3>
              <p className="mono dest-card__country">{selected.country}</p>
              <p className="dest-card__blurb">{selected.blurb}</p>

              {selected.status === 'available' && drop && (
                <>
                  <p className="mono dest-card__drop">
                    Drop {drop.number} · {drop.name}
                  </p>
                  <Link className="btn btn--block" to={`/drops/${drop.id}`}>
                    Explorar la colección <span className="arrow">→</span>
                  </Link>
                </>
              )}
              {selected.status === 'voting' && (
                <button className="btn btn--accent btn--block" onClick={() => onVote(selected.id)}>
                  Votar por {selected.city} <span className="arrow">→</span>
                </button>
              )}
              {selected.status === 'next' && <p className="mono dest-card__note">Ruta confirmada. La colección todavía no está publicada.</p>}
              {selected.status === 'locked' && <p className="mono dest-card__note">{selected.eta}. Sin colección por ahora.</p>}
            </div>
          </motion.article>
        </AnimatePresence>

        <ol className="itinerary" aria-label="Lista de destinos">
          {destinations.map((d) => (
            <li key={d.id}>
              <button className={`itinerary__row ${d.id === selectedId ? 'is-active' : ''}`} onClick={() => select(d)} aria-pressed={d.id === selectedId}>
                <span className="mono itinerary__code">{d.code}</span>
                <span className="itinerary__city">{d.city}</span>
                <span className={`itinerary__status status--${d.status} mono`}>
                  <span className="dot" />
                  <span className="itinerary__status-label">{statusLabel[d.status]}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
