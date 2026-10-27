import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { availableCategories, products } from '../data/products';
import type { Category, Product } from '../data/types';
import { Garment, garmentBox } from './Garment';
import { ProductDetail } from './ProductDetail';
import { Photo } from './Photo';

const spring = { type: 'spring', stiffness: 170, damping: 24, mass: 0.9 } as const;

function Hanger() {
  return (
    <svg className="hanger" viewBox="0 0 120 40" aria-hidden="true">
      <path d="M60 2 C66 2 68 8 63 11 L60 13 L60 17" fill="none" stroke="#2a2826" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M60 17 L8 36 L112 36 Z" fill="none" stroke="#2a2826" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

export function GarmentVisual({ p, colorId, large = false }: { p: Product; colorId: string; large?: boolean }) {
  const c = p.colors.find((x) => x.id === colorId) ?? p.colors[0];
  if (p.images.length) return <Photo media={p.images[0]} className="garment-photo" tone="paper" />;
  return <Garment kind={p.garment} color={c.hex} ink={c.ink} title={`${p.name}, ${c.name}`} className={large ? 'garment--large' : ''} />;
}

export function Wardrobe() {
  const [cat, setCat] = useState<Category | 'todo'>('todo');
  const [selected, setSelected] = useState<string | null>(null);
  const [colors, setColors] = useState<Record<string, string>>({});
  const railRef = useRef<HTMLUListElement>(null);
  const slide = (dir: number) => railRef.current?.scrollBy({ left: dir * railRef.current.clientWidth * 0.6, behavior: 'smooth' });

  const list = useMemo(() => (cat === 'todo' ? products : products.filter((p) => p.category === cat)), [cat]);
  const current = products.find((p) => p.id === selected) ?? null;
  const colorOf = (p: Product) => colors[p.id] ?? p.colors[0].id;

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // La prenda que se abrió desde la percha viaja con layoutId; al pasar a otra se desliza en el lugar
  const [opened, setOpened] = useState<string | null>(null);
  const [dir, setDir] = useState(1);

  const open = (id: string) => {
    setOpened(id);
    setSelected(id);
  };

  const close = () => {
    setSelected(null);
    setOpened(null);
  };

  const step = (d: number) => {
    if (!current) return;
    const i = list.findIndex((p) => p.id === current.id);
    setDir(d);
    setSelected(list[(i + d + list.length) % list.length].id);
  };

  return (
    <LayoutGroup id="wardrobe">
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
          <div className="wardrobe__arrows">
            <button onClick={() => slide(-1)} aria-label="Ver perchas anteriores">
              ←
            </button>
            <button onClick={() => slide(1)} aria-label="Ver más perchas">
              →
            </button>
          </div>
        </div>

        <div className="wardrobe__closet">
          <div className="wardrobe__rail" aria-hidden="true" />
          <ul className="wardrobe__items" role="list" ref={railRef}>
            {list.map((p, i) => {
              const box = garmentBox[p.garment];
              const isSel = p.id === opened;
              return (
                <li key={p.id} className="wardrobe__item" style={{ ['--i' as string]: i }}>
                  <button className="wardrobe__hang" onClick={() => open(p.id)} aria-label={`Ver ${p.name}`} aria-haspopup="dialog">
                    <Hanger />
                    <span className="wardrobe__garment" style={{ aspectRatio: `${box.w} / ${box.h}` }}>
                      {!isSel && (
                        <motion.span layoutId={`g-${p.id}`} transition={spring} className="wardrobe__garment-inner">
                          <GarmentVisual p={p} colorId={colorOf(p)} />
                        </motion.span>
                      )}
                    </span>
                    <span className="wardrobe__tagline">
                      <span className="mono">{String(i + 1).padStart(2, '0')}</span>
                      <span>{p.name}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
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
                visual={
                  <div className="pdp__stage" style={{ aspectRatio: `${garmentBox[current.garment].w} / ${garmentBox[current.garment].h}` }}>
                    {current.id === opened ? (
                      <motion.span layoutId={`g-${current.id}`} transition={spring} className="wardrobe__garment-inner">
                        <GarmentVisual p={current} colorId={colorOf(current)} large />
                      </motion.span>
                    ) : (
                      <motion.span
                        key={current.id}
                        className="wardrobe__garment-inner"
                        initial={{ opacity: 0, x: dir * 48 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <GarmentVisual p={current} colorId={colorOf(current)} large />
                      </motion.span>
                    )}
                  </div>
                }
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </LayoutGroup>
  );
}
