import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { products } from '../data/products';
import type { GarmentKind } from '../data/types';
import { layeredProvider, type Build, type FitLabel } from '../services/tryon';

/**
 * Probador ilustrativo: silueta paramétrica + prenda dibujada sobre ella según medidas.
 * No es una simulación física: la interfaz lo explica al lado del resultado.
 */

const compatible = products.filter((p) => p.measurements && ['tee', 'crew', 'hoodie'].includes(p.garment));

const builds: { id: Build; label: string }[] = [
  { id: 'recta', label: 'Recta' },
  { id: 'atletica', label: 'Atlética' },
  { id: 'curvas', label: 'Curvas' },
];

const ratios: Record<Build, { sh: number; ch: number; wa: number; hi: number }> = {
  recta: { sh: 1, ch: 1, wa: 1, hi: 0.96 },
  atletica: { sh: 1.12, ch: 1.08, wa: 0.92, hi: 0.93 },
  curvas: { sh: 0.95, ch: 1.03, wa: 0.86, hi: 1.13 },
};

const fitCopy: Record<FitLabel, string> = {
  chico: 'Probablemente te quede chico',
  ajustado: 'Calce ajustado',
  regular: 'Calce regular',
  holgado: 'Calce holgado, oversize',
  'muy holgado': 'Muy holgado',
};

const VB_W = 320;
const VB_H = 600;
const GROUND = 584;
const REF_CM = 200; // altura que ocupa todo el alto disponible

interface BodyGeo {
  H: number;
  top: number;
  y: (f: number) => number;
  x: (f: number) => number;
  S: number;
  C: number;
  Wa: number;
  Hi: number;
}

function bodyGeometry(heightCm: number, weightKg: number, build: Build): BodyGeo {
  const H = ((GROUND - 16) * heightCm) / REF_CM;
  const top = GROUND - H;
  const bmi = weightKg / (heightCm / 100) ** 2;
  const wf = Math.min(1.55, Math.max(0.8, 0.84 + (bmi - 19) * 0.036));
  const r = ratios[build];
  return {
    H,
    top,
    y: (f) => top + f * H,
    x: (f) => f * H,
    S: 0.118 * wf * r.sh,
    C: 0.1 * wf * r.ch,
    Wa: 0.084 * wf * r.wa,
    Hi: 0.098 * wf * r.hi,
  };
}

function Body({ g }: { g: BodyGeo }) {
  const cx = VB_W / 2;
  const { x, y, S, C, Wa, Hi } = g;
  const torso = `M${cx - x(0.028)},${y(0.135)} C${cx - x(0.04)},${y(0.16)} ${cx - x(S) + x(0.03)},${y(0.165)} ${cx - x(S)},${y(0.19)}
    C${cx - x(C) - x(0.01)},${y(0.24)} ${cx - x(C)},${y(0.3)} ${cx - x(Wa)},${y(0.4)}
    C${cx - x(Hi)},${y(0.46)} ${cx - x(Hi)},${y(0.5)} ${cx - x(Hi) + x(0.004)},${y(0.53)}
    L${cx + x(Hi) - x(0.004)},${y(0.53)} C${cx + x(Hi)},${y(0.5)} ${cx + x(Hi)},${y(0.46)} ${cx + x(Wa)},${y(0.4)}
    C${cx + x(C)},${y(0.3)} ${cx + x(C) + x(0.01)},${y(0.24)} ${cx + x(S)},${y(0.19)}
    C${cx + x(S) - x(0.03)},${y(0.165)} ${cx + x(0.04)},${y(0.16)} ${cx + x(0.028)},${y(0.135)} Z`;
  const leg = (s: 1 | -1) => {
    const outer = cx + s * (x(Hi) - x(0.004));
    const inner = cx + s * x(0.008);
    const kneeO = cx + s * x(Hi * 0.62);
    const kneeI = cx + s * x(0.022);
    return `M${outer},${y(0.52)} C${outer},${y(0.62)} ${kneeO + s * x(0.012)},${y(0.68)} ${kneeO},${y(0.74)}
      C${kneeO - s * x(0.004)},${y(0.86)} ${cx + s * x(0.052)},${y(0.94)} ${cx + s * x(0.05)},${y(0.975)}
      L${cx + s * x(0.07)},${y(0.995)} L${cx + s * x(0.018)},${y(0.995)}
      C${cx + s * x(0.02)},${y(0.94)} ${kneeI},${y(0.86)} ${kneeI},${y(0.74)}
      C${kneeI},${y(0.66)} ${inner},${y(0.6)} ${inner},${y(0.54)} Z`;
  };
  const arm = (s: 1 | -1) => {
    const sx = cx + s * x(S);
    return `M${sx - s * x(0.012)},${y(0.188)} C${sx + s * x(0.03)},${y(0.2)} ${sx + s * x(0.035)},${y(0.3)} ${sx + s * x(0.036)},${y(0.36)}
      C${sx + s * x(0.04)},${y(0.43)} ${sx + s * x(0.05)},${y(0.48)} ${sx + s * x(0.052)},${y(0.53)}
      L${sx + s * x(0.03)},${y(0.535)} C${sx + s * x(0.022)},${y(0.47)} ${sx + s * x(0.008)},${y(0.42)} ${sx + s * x(0.002)},${y(0.36)}
      C${sx - s * x(0.004)},${y(0.3)} ${sx - s * x(0.016)},${y(0.25)} ${sx - s * x(0.03)},${y(0.24)} Z`;
  };
  return (
    <g className="fit__body">
      <path d={arm(-1)} />
      <path d={arm(1)} />
      <path d={leg(-1)} />
      <path d={leg(1)} />
      <path d={torso} />
      <rect x={cx - x(0.026)} y={y(0.11)} width={x(0.052)} height={x(0.05)} />
      <ellipse cx={cx} cy={y(0.062)} rx={x(0.048)} ry={x(0.062)} />
    </g>
  );
}

function TopLayer({
  g,
  kind,
  chestCm,
  lengthCm,
  heightCm,
  color,
  ink,
}: {
  g: BodyGeo;
  kind: GarmentKind;
  chestCm: number;
  lengthCm: number;
  heightCm: number;
  color: string;
  ink: string;
}) {
  const cx = VB_W / 2;
  const { x, y } = g;
  // Medio ancho de la prenda vista de frente (contorno / 4) como fracción de la altura del cuerpo
  const half = Math.max(chestCm / 4 / heightCm, g.C * 0.92);
  const shoulder = Math.max(g.S, half * 0.98);
  const hemY = 0.17 + lengthCm / heightCm;
  const long = kind !== 'tee';
  const sleeveEnd = long ? 0.52 : 0.3;
  const sleeveOut = long ? 0.05 : 0.07 + (half - g.C) * 0.6;
  const collar = kind === 'hoodie' ? 0.04 : 0.032;

  const side = (s: 1 | -1) => `${cx + s * x(shoulder)},${y(0.178)} ${cx + s * x(shoulder + sleeveOut)},${y(sleeveEnd)}`;
  const sleeveIn = (s: 1 | -1) => `${cx + s * x(shoulder + sleeveOut - (long ? 0.034 : 0.052))},${y(sleeveEnd + (long ? 0.006 : 0.012))}`;
  const armpit = (s: 1 | -1) => `${cx + s * x(half)},${y(long ? 0.25 : 0.24)}`;

  const d = `M${cx - x(collar)},${y(0.152)} L${side(-1).split(' ')[0]} L${side(-1).split(' ')[1]} L${sleeveIn(-1)} L${armpit(-1)}
    L${cx - x(half * 1.01)},${y(hemY)} Q${cx},${y(hemY + 0.006)} ${cx + x(half * 1.01)},${y(hemY)}
    L${armpit(1)} L${sleeveIn(1)} L${side(1).split(' ')[1]} L${side(1).split(' ')[0]} L${cx + x(collar)},${y(0.152)}
    Q${cx},${y(0.175)} ${cx - x(collar)},${y(0.152)} Z`;

  return (
    <g className="fit__top">
      {kind === 'hoodie' && (
        <path
          d={`M${cx - x(0.07)},${y(0.16)} C${cx - x(0.08)},${y(0.1)} ${cx + x(0.08)},${y(0.1)} ${cx + x(0.07)},${y(0.16)} Z`}
          fill={color}
          filter="brightness(0.8)"
        />
      )}
      <path d={d} fill={color} />
      <path d={d} fill="url(#fit-shade)" />
      <path d={`M${cx - x(collar)},${y(0.152)} Q${cx},${y(0.178)} ${cx + x(collar)},${y(0.152)}`} fill="none" stroke="rgba(0,0,0,.25)" strokeWidth="2.4" />
      {kind === 'hoodie' && (
        <path
          d={`M${cx - x(half * 0.6)},${y(hemY - 0.11)} L${cx + x(half * 0.6)},${y(hemY - 0.11)} L${cx + x(half * 0.7)},${y(hemY - 0.03)} L${cx - x(half * 0.7)},${y(hemY - 0.03)} Z`}
          fill="none"
          stroke="rgba(0,0,0,.2)"
          strokeWidth="1.4"
        />
      )}
      <text
        x={cx}
        y={y(0.255)}
        textAnchor="middle"
        fontFamily="'Permanent Marker', cursive"
        fontSize={x(0.07)}
        fill={ink}
        transform={`rotate(-6 ${cx} ${y(0.255)})`}
      >
        BILAIR
      </text>
    </g>
  );
}

export function VirtualFit() {
  const [params] = useSearchParams();
  const initial = compatible.find((p) => p.id === params.get('prenda')) ?? compatible[0];
  const [productId, setProductId] = useState(initial?.id);
  const [build, setBuild] = useState<Build>('recta');
  const [height, setHeight] = useState(175);
  const [weight, setWeight] = useState(72);
  const [usual, setUsual] = useState('M');
  const [size, setSize] = useState('M');
  const [colorId, setColorId] = useState<string | undefined>(initial?.colors[0].id);

  useEffect(() => {
    const id = params.get('prenda');
    if (id && compatible.some((p) => p.id === id)) setProductId(id);
  }, [params]);

  const product = compatible.find((p) => p.id === productId) ?? compatible[0];
  const color = product?.colors.find((c) => c.id === colorId) ?? product?.colors[0];
  const m = product?.measurements?.[size];

  const geo = useMemo(() => bodyGeometry(height, weight, build), [height, weight, build]);
  const fit = useMemo(
    () => (m ? layeredProvider.estimate({ heightCm: height, weightKg: weight, build, usualSize: usual, size, garmentChestCm: m.chest * 2 }) : null),
    [m, height, weight, build, usual, size],
  );

  if (!product || !color || !m || !fit) return <p className="mono">No hay prendas compatibles con Virtual Fit cargadas todavía.</p>;

  const sizes = Object.keys(product.measurements!);

  return (
    <div className="fit">
      <form className="fit__panel" onSubmit={(e) => e.preventDefault()} aria-label="Configurar prueba virtual">
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

        <fieldset className="fit__step">
          <legend className="mono">
            <b>02</b> Silueta
          </legend>
          <div className="fit__builds">
            {builds.map((b) => (
              <button
                type="button"
                key={b.id}
                className={`chip ${b.id === build ? 'is-active' : ''}`}
                aria-pressed={b.id === build}
                onClick={() => setBuild(b.id)}
              >
                {b.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="fit__step fit__measures">
          <legend className="mono">
            <b>03</b> Altura y peso
          </legend>
          <label>
            <span className="mono">Altura · {height} cm</span>
            <input type="range" min={145} max={205} value={height} onChange={(e) => setHeight(+e.target.value)} />
          </label>
          <label>
            <span className="mono">Peso · {weight} kg</span>
            <input type="range" min={40} max={140} value={weight} onChange={(e) => setWeight(+e.target.value)} />
          </label>
        </fieldset>

        <fieldset className="fit__step">
          <legend className="mono">
            <b>04</b> Tu talle habitual
          </legend>
          <div className="sizes sizes--sm">
            {sizes.map((s) => (
              <button
                type="button"
                key={s}
                className={`size ${usual === s ? 'is-active' : ''}`}
                aria-pressed={usual === s}
                onClick={() => {
                  setUsual(s);
                  setSize(s);
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="fit__step">
          <legend className="mono">
            <b>05</b> Talle a probar
          </legend>
          <div className="sizes sizes--sm">
            {sizes.map((s) => (
              <button type="button" key={s} className={`size ${size === s ? 'is-active' : ''}`} aria-pressed={size === s} onClick={() => setSize(s)}>
                {s}
              </button>
            ))}
          </div>
        </fieldset>
      </form>

      <div className="fit__stage">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="fit__svg"
          role="img"
          aria-label={`Silueta de ${height} cm con ${product.name} talle ${size}: ${fitCopy[fit.label]}`}
        >
          <defs>
            <linearGradient id="fit-shade" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity="0.1" />
              <stop offset="1" stopColor="#000" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          <g className="fit__ruler">
            {[150, 160, 170, 180, 190, 200].map((cm) => {
              const yy = GROUND - ((GROUND - 16) * cm) / REF_CM;
              return (
                <g key={cm}>
                  <line x1="8" x2="22" y1={yy} y2={yy} />
                  <text x="26" y={yy + 3}>
                    {cm}
                  </text>
                </g>
              );
            })}
            <line x1="8" x2={VB_W - 8} y1={GROUND} y2={GROUND} />
          </g>
          <g className="fit__figure">
            <Body g={geo} />
            <TopLayer g={geo} kind={product.garment} chestCm={m.chest * 2} lengthCm={m.length} heightCm={height} color={color.hex} ink={color.ink} />
          </g>
        </svg>

        <div className="fit__result" aria-live="polite">
          <p className="mono">Resultado estimado · talle {size}</p>
          <p className="display h-sm">{fitCopy[fit.label]}</p>
          <dl className="fit__numbers mono">
            <div>
              <dt>Pecho prenda</dt>
              <dd>{m.chest * 2} cm</dd>
            </div>
            <div>
              <dt>Tu pecho (aprox.)</dt>
              <dd>{fit.bodyChestCm} cm</dd>
            </div>
            <div>
              <dt>Holgura</dt>
              <dd>
                {fit.easeCm > 0 ? '+' : ''}
                {fit.easeCm} cm
              </dd>
            </div>
          </dl>
          <p className="fit__disclaimer">
            Esto es una <strong>vista ilustrativa</strong>, no una simulación de la tela ni una garantía de talle. La altura y el peso no alcanzan para predecir
            cómo te queda una prenda: usalo como referencia junto a la tabla de medidas.
            {product.demo && ' Las medidas de esta prenda son de muestra.'}
          </p>
        </div>
      </div>

      <aside className="fit__photo">
        <p className="mono">Probar con tu foto · próximamente</p>
        <p>
          Estamos preparando una prueba con foto. Cuando esté disponible te vamos a pedir la imagen de forma explícita, vas a ver cómo se procesa y nada se va a
          subir sin tu consentimiento. Hoy no se sube ninguna imagen.
        </p>
      </aside>
    </div>
  );
}
