import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { availableCategories, products } from '../data/products';
import { HANG, MODELS } from '../data/garmentModels';
import type { Category, Product, ProductColor } from '../data/types';
import type { ClosetScene } from '../three/ClosetScene';
import { usePrefersReducedMotion } from '../hooks/useReveal';
import { garmentBox } from './Garment';
import { GarmentImage } from './GarmentImage';
import { ProductDetail } from './ProductDetail';
import { GarmentStudio, supports3D } from './GarmentStudio';

/** Distancia desde arriba de la escena hasta el barral, en px (el estante de madera va por encima) */
const RAIL_PX = 64;

export function GarmentVisual({ p, colorId }: { p: Product; colorId: string; large?: boolean }) {
  return <GarmentImage p={p} colorId={colorId} />;
}

interface Hanging {
  key: string;
  p: Product;
  c: ProductColor;
}

/** Una percha por producto y color */
const hanging: Hanging[] = products.flatMap((p) => (MODELS[p.garment] && HANG[p.garment] ? p.colors.map((c) => ({ key: `${p.id}:${c.id}`, p, c })) : []));

export function Wardrobe() {
  const [cat, setCat] = useState<Category | 'todo'>('todo');
  const [selected, setSelected] = useState<string | null>(null);
  const [colors, setColors] = useState<Record<string, string>>({});
  const [dir, setDir] = useState(1);
  const reduced = usePrefersReducedMotion();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneBoxRef = useRef<HTMLDivElement>(null);
  const peekRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ClosetScene | null>(null);
  const [near, setNear] = useState(false);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [openKey, setOpenKey] = useState<string | null>(null);

  const list = useMemo(() => (cat === 'todo' ? products : products.filter((p) => p.category === cat)), [cat]);
  const rail = useMemo(() => hanging.filter((h) => cat === 'todo' || h.p.category === cat), [cat]);
  const current = products.find((p) => p.id === selected) ?? null;
  const colorOf = (p: Product) => colors[p.id] ?? p.colors[0].id;
  const opened = hanging.find((h) => h.key === openKey) ?? null;

  const select = (key: string) => {
    const h = hanging.find((x) => x.key === key);
    if (!h) return;
    setColors((c) => ({ ...c, [h.p.id]: h.c.id }));
    setDir(1);
    setSelected(h.p.id);
  };
  const selectRef = useRef(select);
  selectRef.current = select;

  const close = () => setSelected(null);

  const step = (d: number) => {
    if (!current) return;
    const i = list.findIndex((p) => p.id === current.id);
    setDir(d);
    setSelected(list[(i + d + list.length) % list.length].id);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' && !selected) return;
      if (e.key === 'Escape') (selected ? close : () => sceneRef.current?.open(null))();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // La escena 3D se carga recién cuando el ropero se acerca a la pantalla
  useEffect(() => {
    const el = sceneBoxRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '700px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const box = sceneBoxRef.current;
    if (!near || !canvas || !box) return;
    let disposed = false;
    let cleanup = () => {};
    setState('loading');
    import('../three/ClosetScene')
      .then(async ({ ClosetScene }) => {
        if (disposed) return;
        const scene = new ClosetScene({
          canvas,
          items: hanging.map((h) => ({ key: h.key, model: MODELS[h.p.garment]!, hang: HANG[h.p.garment]!, color: h.c.hex })),
          reducedMotion: reduced,
          railPx: RAIL_PX,
          onOpen: setOpenKey,
          onSelect: (key) => selectRef.current(key),
          onAnchor: (x, y) => {
            const el = peekRef.current;
            if (el) el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
          },
        });
        try {
          await scene.load();
        } catch (err) {
          scene.dispose();
          throw err;
        }
        if (disposed) {
          scene.dispose();
          return;
        }
        sceneRef.current = scene;
        setState('ready');
        const io = new IntersectionObserver(([e]) => scene.setVisible(e.isIntersecting && !document.hidden), { threshold: 0.05 });
        io.observe(box);
        const onVisibility = () =>
          scene.setVisible(!document.hidden && box.getBoundingClientRect().bottom > 0 && box.getBoundingClientRect().top < window.innerHeight);
        document.addEventListener('visibilitychange', onVisibility);
        cleanup = () => {
          io.disconnect();
          document.removeEventListener('visibilitychange', onVisibility);
          scene.dispose();
        };
      })
      .catch(() => !disposed && setState('failed'));
    return () => {
      disposed = true;
      sceneRef.current = null;
      cleanup();
    };
  }, [near, reduced]);

  // Con la ficha abierta el ropero queda oculto: no hace falta seguir dibujándolo
  useEffect(() => {
    if (state === 'ready') sceneRef.current?.setVisible(!selected);
  }, [selected, state]);

  // Pestañas de categoría: el barral muestra solo esas prendas
  useEffect(() => {
    if (state === 'ready') sceneRef.current?.setFilter(rail.map((h) => h.key));
  }, [rail, state]);

  return (
    <div className={`wardrobe ${current ? 'is-detail' : ''}`}>
      <div className="wardrobe__toolbar">
        <div className="wardrobe__tabs" role="tablist" aria-label="Categorías">
          {[{ id: 'todo' as const, label: 'Todo' }, ...availableCategories].map((c) => (
            <button
              key={c.id}
              role="tab"
              aria-selected={c.id === cat}
              className="wardrobe__tab mono"
              onClick={() => {
                setCat(c.id);
                close();
              }}
            >
              {c.label}
              <sup>{c.id === 'todo' ? products.length : products.filter((p) => p.category === c.id).length}</sup>
            </button>
          ))}
        </div>
        {state === 'ready' && (
          <div className="wardrobe__arrows">
            <button onClick={() => sceneRef.current?.pan(-1)} aria-label="Correr el barral hacia la izquierda">
              ←
            </button>
            <button onClick={() => sceneRef.current?.pan(1)} aria-label="Correr el barral hacia la derecha">
              →
            </button>
          </div>
        )}
      </div>

      <div className="wardrobe__closet">
        <div className="wardrobe__shelf" aria-hidden="true" />
        <div ref={sceneBoxRef} className={`wardrobe__scene wardrobe__scene--${state}`}>
          {state !== 'failed' && <canvas ref={canvasRef} className="wardrobe__canvas" aria-hidden="true" />}
          {state === 'loading' && <span className="studio__loading" aria-hidden="true" />}

          {/* Cartel de la prenda abierta */}
          {opened && state === 'ready' && (
            <div ref={peekRef} className="wardrobe__peek">
              <div className="wardrobe__peek-card">
                <p>
                  <strong>{opened.p.name}</strong>
                  <span className="mono">{opened.c.name}</span>
                </p>
                <button className="btn btn--accent" onClick={() => select(opened.key)}>
                  Ver prenda <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          )}

          {/* Las mismas perchas como botones: para teclado y lectores de pantalla, y como vista sin 3D */}
          <ul className={state === 'failed' ? 'wardrobe__fallback' : 'sr-only'} role="list">
            {rail.map((h) => (
              <li key={h.key}>
                <button onFocus={() => sceneRef.current?.open(h.key)} onClick={() => select(h.key)} aria-label={`${h.p.name}, ${h.c.name}. Ver prenda`}>
                  {state === 'failed' && <GarmentImage p={h.p} colorId={h.c.id} />}
                  {state === 'failed' && (
                    <span className="mono">
                      {h.p.name} · {h.c.name}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          {state === 'ready' && !openKey && (
            <p className="wardrobe__hint mono" aria-hidden="true">
              Tocá una prenda para abrirla
            </p>
          )}
        </div>
        <div className="wardrobe__floor" aria-hidden="true" />
      </div>

      <AnimatePresence>
        {current && (
          <motion.div
            className="wardrobe__detail"
            role="dialog"
            aria-modal="false"
            aria-label={current.name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <ProductDetail
              product={current}
              colorId={colorOf(current)}
              onColor={(id) => setColors((c) => ({ ...c, [current.id]: id }))}
              onPrev={list.length > 1 ? () => step(-1) : undefined}
              onNext={list.length > 1 ? () => step(1) : undefined}
              onClose={close}
              headingLevel="h3"
              visual={(() => {
                const flat = (
                  <div className="pdp__stage" style={{ aspectRatio: `${garmentBox[current.garment].w} / ${garmentBox[current.garment].h}` }}>
                    <motion.span
                      key={current.id}
                      className="wardrobe__garment-inner"
                      initial={{ opacity: 0, x: dir * 48 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <GarmentVisual p={current} colorId={colorOf(current)} />
                    </motion.span>
                  </div>
                );
                return supports3D(current) ? <GarmentStudio key={current.id} product={current} colorId={colorOf(current)} fallback={flat} /> : flat;
              })()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
