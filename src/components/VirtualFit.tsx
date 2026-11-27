import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { products } from '../data/products';
import type { Product } from '../data/types';
import { layeredProvider, type Build, type FitEstimate, type FitLabel } from '../services/tryon';
import { garmentRender } from './GarmentImage';

/**
 * Buscador de talle: con altura, peso, contextura y el calce que te gusta recomienda un talle
 * y muestra la prenda con sus medidas reales (ancho de pecho y largo) para cada talle.
 * Es una estimación: la interfaz lo aclara al lado del resultado.
 */

const compatible = products.filter((p) => p.measurements && garmentRender(p, undefined));

const builds: { id: Build; label: string }[] = [
  { id: 'recta', label: 'Recta' },
  { id: 'atletica', label: 'Atlética' },
  { id: 'curvas', label: 'Curvas' },
];

type Pref = 'cuerpo' | 'regular' | 'oversize';

/** Holgura de pecho (cm) que busca cada preferencia de calce */
const prefs: { id: Pref; label: string; ease: number }[] = [
  { id: 'cuerpo', label: 'Al cuerpo', ease: 8 },
  { id: 'regular', label: 'Regular', ease: 16 },
  { id: 'oversize', label: 'Oversize', ease: 28 },
];

const fitCopy: Record<FitLabel, string> = {
  chico: 'Te puede quedar chico',
  ajustado: 'Al cuerpo',
  regular: 'Regular',
  holgado: 'Holgado, oversize',
  'muy holgado': 'Muy holgado',
};

/** Dónde caen las cotas sobre la imagen de cada prenda, en fracciones de la imagen */
const GUIDES: Partial<Record<Product['garment'], { chestY: number; chestX: [number, number]; top: number; bottom: number; lengthX: number }>> = {
  tee: { chestY: 0.4, chestX: [0.215, 0.785], top: 0.03, bottom: 0.985, lengthX: 0.9 },
  hoodie: { chestY: 0.47, chestX: [0.265, 0.735], top: 0.17, bottom: 0.845, lengthX: 0.69 },
};

/** Posición en la barra de calce: de 0 cm (justo) a 40 cm de holgura */
const gauge = (ease: number) => `${Math.min(100, Math.max(0, (ease / 40) * 100))}%`;

export function VirtualFit() {
  const [params] = useSearchParams();
  const initial = compatible.find((p) => p.id === params.get('prenda')) ?? compatible[0];
  const [productId, setProductId] = useState(initial?.id);
  const [build, setBuild] = useState<Build>('recta');
  const [height, setHeight] = useState(175);
  const [weight, setWeight] = useState(72);
  const [pref, setPref] = useState<Pref>('regular');
  /** Talle elegido a mano; null = se muestra el recomendado */
  const [picked, setPicked] = useState<string | null>(null);
  const [colorId, setColorId] = useState<string | undefined>(initial?.colors[0].id);

  useEffect(() => {
    const id = params.get('prenda');
    if (id && compatible.some((p) => p.id === id)) setProductId(id);
  }, [params]);

  const product = compatible.find((p) => p.id === productId) ?? compatible[0];
  const color = product?.colors.find((c) => c.id === colorId) ?? product?.colors[0];
  const table = product?.measurements;

  const rows = useMemo(() => {
    if (!table) return [];
    return Object.entries(table).map(([size, m]) => ({
      size,
      m,
      fit: layeredProvider.estimate({ heightCm: height, weightKg: weight, build, usualSize: size, size, garmentChestCm: m.chest * 2 }) as FitEstimate,
    }));
  }, [table, height, weight, build]);

  const recommended = useMemo(() => {
    const target = prefs.find((p) => p.id === pref)!.ease;
    const ok = rows.filter((r) => r.fit.label !== 'chico');
    const pool = ok.length ? ok : rows;
    return pool.reduce<(typeof rows)[number] | null>(
      (best, r) => (!best || Math.abs(r.fit.easeCm - target) < Math.abs(best.fit.easeCm - target) ? r : best),
      null,
    );
  }, [rows, pref]);

  if (!product || !color || !rows.length || !recommended) return <p className="mono">Todavía no hay prendas con tabla de medidas cargada.</p>;

  const current = rows.find((r) => r.size === picked) ?? recommended;
  const image = garmentRender(product, color.id)!;
  const guide = GUIDES[product.garment];
  const chests = rows.map((r) => r.m.chest);
  const minChest = Math.min(...chests);
  const maxChest = Math.max(...chests);
  const scale = 0.86 + 0.14 * (maxChest > minChest ? (current.m.chest - minChest) / (maxChest - minChest) : 1);
  const reset = () => setPicked(null);

  return (
    <div className="fit">
      <form className="fit__panel" onSubmit={(e) => e.preventDefault()} aria-label="Datos para recomendar el talle">
        <fieldset className="fit__step">
          <legend className="mono">
            <b>01</b> Prenda
          </legend>
          <div className="fit__products">
            {compatible.map((p) => (
              <button
                type="button"
                key={p.id}
                className={`chip ${p.id === product.id ? 'is-active' : ''}`}
                aria-pressed={p.id === product.id}
                onClick={() => {
                  setProductId(p.id);
                  setColorId(p.colors[0].id);
                  reset();
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
          <div className="swatches">
            {product.colors.map((c) => (
              <button
                type="button"
                key={c.id}
                className={`swatch ${c.id === color.id ? 'is-active' : ''}`}
                style={{ background: c.hex }}
                aria-label={c.name}
                aria-pressed={c.id === color.id}
                onClick={() => setColorId(c.id)}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="fit__step fit__measures">
          <legend className="mono">
            <b>02</b> Altura y peso
          </legend>
          <label>
            <span className="mono">Altura · {height} cm</span>
            <input
              type="range"
              min={145}
              max={205}
              value={height}
              onChange={(e) => {
                setHeight(+e.target.value);
                reset();
              }}
            />
          </label>
          <label>
            <span className="mono">Peso · {weight} kg</span>
            <input
              type="range"
              min={40}
              max={140}
              value={weight}
              onChange={(e) => {
                setWeight(+e.target.value);
                reset();
              }}
            />
          </label>
        </fieldset>

        <fieldset className="fit__step">
          <legend className="mono">
            <b>03</b> Contextura
          </legend>
          <div className="fit__builds">
            {builds.map((b) => (
              <button
                type="button"
                key={b.id}
                className={`chip ${b.id === build ? 'is-active' : ''}`}
                aria-pressed={b.id === build}
                onClick={() => {
                  setBuild(b.id);
                  reset();
                }}
              >
                {b.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="fit__step">
          <legend className="mono">
            <b>04</b> Cómo te gusta que te quede
          </legend>
          <div className="fit__builds">
            {prefs.map((p) => (
              <button
                type="button"
                key={p.id}
                className={`chip ${p.id === pref ? 'is-active' : ''}`}
                aria-pressed={p.id === pref}
                onClick={() => {
                  setPref(p.id);
                  reset();
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </fieldset>
      </form>

      <div className="fit__stage">
        <div className="fit__visual">
          <p className="fit__visual-head mono">
            <span>
              {product.name} · {color.name}
            </span>
            <span>Talle {current.size}</span>
          </p>
          <div
            className={`fit__garment fit__garment--${product.garment}`}
            style={{ aspectRatio: `${image.width} / ${image.height}`, transform: `scale(${scale})` }}
          >
            <img src={image.src} width={image.width} height={image.height} alt={`${product.name} ${color.name}, talle ${current.size}`} draggable={false} />
            {guide && (
              <>
                <span
                  className="fit__dim fit__dim--chest"
                  style={{ left: `${guide.chestX[0] * 100}%`, width: `${(guide.chestX[1] - guide.chestX[0]) * 100}%`, top: `${guide.chestY * 100}%` }}
                >
                  <b className="mono">Pecho {current.m.chest} cm</b>
                </span>
                <span
                  className="fit__dim fit__dim--length"
                  style={{ left: `${guide.lengthX * 100}%`, top: `${guide.top * 100}%`, height: `${(guide.bottom - guide.top) * 100}%` }}
                >
                  <b className="mono">Largo {current.m.length} cm</b>
                </span>
              </>
            )}
          </div>
        </div>

        <div className="fit__result">
          <div className="fit__reco" aria-live="polite">
            <p className="mono">{current === recommended ? 'Tu talle recomendado' : 'Estás viendo el talle'}</p>
            <p className="fit__size display">{current.size}</p>
            <p className="fit__label">
              {fitCopy[current.fit.label]}
              <span className="mono">
                {' '}
                · holgura {current.fit.easeCm > 0 ? '+' : ''}
                {current.fit.easeCm} cm
              </span>
            </p>
          </div>

          <ul className="fit__sizes" aria-label="Cómo te queda cada talle">
            {rows.map((r) => (
              <li key={r.size}>
                <button type="button" className={`fit__row ${r === current ? 'is-active' : ''}`} aria-pressed={r === current} onClick={() => setPicked(r.size)}>
                  <span className="fit__row-size display">{r.size}</span>
                  <span className="fit__row-info">
                    <span className="fit__row-label">
                      {fitCopy[r.fit.label]}
                      {r === recommended && <em className="mono">Recomendado</em>}
                    </span>
                    <span className="fit__gauge" aria-hidden="true">
                      <i style={{ left: gauge(r.fit.easeCm) }} />
                    </span>
                  </span>
                  <span className="fit__row-cm mono">
                    {r.m.chest} × {r.m.length}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="fit__scale mono" aria-hidden="true">
            <span>Justo</span>
            <span>Holgado</span>
          </p>

          <p className="fit__disclaimer">
            Es una <strong>estimación</strong>: calculamos tu contorno de pecho (aprox. {current.fit.bodyChestCm} cm) a partir de tu altura, peso y contextura,
            y lo comparamos con las medidas de la prenda (ancho de pecho × largo, en cm). Usalo como referencia junto a la tabla de medidas.
            {product.demo && ' Las medidas de esta prenda son de muestra.'}
          </p>
        </div>
      </div>
    </div>
  );
}
