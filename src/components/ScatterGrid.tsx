import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Category, Product } from '../data/types';
import { categories } from '../data/products';
import { formatPrice } from '../config/site';
import { GarmentImage } from './GarmentImage';

/**
 * Grilla de prendas con filtros "dispersar y reagrupar":
 * las cartas visibles salen despedidas desde el centro de la colección (360 ms)
 * y las del nuevo filtro vuelven desde esa misma dispersión a su lugar (640 ms).
 */

type Filter = Category | 'todo';

const OUT_MS = 360;
const IN_MS = 640;
const ease = (t: number) => 1 - (1 - t) ** 3;

/** Rotación fija por carta, alternando sentido, entre 10° y 14° */
const rotationOf = (i: number) => (i % 2 ? 1 : -1) * (10 + ((i * 7) % 5));

interface Layout {
  cols: number;
  cardW: number;
  cardH: number;
  height: number;
  slots: Map<number, { x: number; y: number }>;
}

export function ScatterGrid({ items }: { items: Product[] }) {
  const filters = useMemo(() => {
    const present = categories.filter((c) => items.some((p) => p.category === c.id));
    return [{ id: 'todo' as Filter, label: 'Todo' }, ...present];
  }, [items]);
  const [filter, setFilter] = useState<Filter>('todo');
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const raf = useRef(0);
  const current = useRef<Filter>('todo');

  const visibleOf = useCallback((f: Filter) => items.map((p, i) => (f === 'todo' || p.category === f ? i : -1)).filter((i) => i >= 0), [items]);
  const count = visibleOf(filter).length;

  const measure = useCallback(
    (f: Filter): Layout => {
      const el = containerRef.current!;
      const width = el.clientWidth;
      const narrow = window.matchMedia('(max-width: 600px)').matches;
      const cols = narrow ? 3 : 4;
      const gap = narrow ? 10 : 18;
      const cardW = (width - gap * (cols - 1)) / cols;
      // Alto real de una carta a ese ancho (ilustración + texto)
      const probe = cardRefs.current.find(Boolean);
      if (probe) probe.style.width = `${cardW}px`;
      const cardH = probe ? probe.offsetHeight : cardW * 1.4;
      const visible = visibleOf(f);
      const slots = new Map<number, { x: number; y: number }>();
      visible.forEach((idx, k) => slots.set(idx, { x: (k % cols) * (cardW + gap), y: Math.floor(k / cols) * (cardH + gap) }));
      const rows = Math.max(1, Math.ceil(visible.length / cols));
      return { cols, cardW, cardH, height: rows * cardH + (rows - 1) * gap, slots };
    },
    [visibleOf],
  );

  /** Geometría de reposo exacta, sin transformaciones */
  const settle = useCallback(
    (f: Filter) => {
      const el = containerRef.current;
      if (!el) return;
      const L = measure(f);
      el.style.height = `${L.height}px`;
      cardRefs.current.forEach((card, i) => {
        if (!card) return;
        const slot = L.slots.get(i);
        card.style.width = `${L.cardW}px`;
        card.style.transform = '';
        if (slot) {
          card.style.left = `${slot.x}px`;
          card.style.top = `${slot.y}px`;
          card.style.opacity = '1';
          card.style.visibility = 'visible';
          card.removeAttribute('aria-hidden');
          card.querySelector('a')?.removeAttribute('tabindex');
        } else {
          card.style.opacity = '0';
          card.style.visibility = 'hidden';
          card.setAttribute('aria-hidden', 'true');
          card.querySelector('a')?.setAttribute('tabindex', '-1');
        }
      });
    },
    [measure],
  );

  useLayoutEffect(() => settle(current.current), [settle]);

  // Recalcula con cada cambio de tamaño; corta cualquier animación en curso
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Solo el ancho importa: la altura la cambia la propia grilla al reordenarse
    let lastWidth = el.clientWidth;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === lastWidth) return;
      lastWidth = el.clientWidth;
      cancelAnimationFrame(raf.current);
      settle(current.current);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf.current);
    };
  }, [settle]);

  const choose = (next: Filter) => {
    if (next === current.current) return;
    const prev = current.current;
    current.current = next;
    setFilter(next);
    cancelAnimationFrame(raf.current);
    // Partimos siempre de un reposo exacto: solo la última selección termina su animación
    settle(prev);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      settle(next);
      return;
    }

    const el = containerRef.current!;
    const cards = cardRefs.current;
    const outgoing = visibleOf(prev);
    const scatter = (i: number, center: { x: number; y: number }, L: { cardW: number; cardH: number }, slot: { x: number; y: number }) => ({
      dx: (slot.x + L.cardW / 2 - center.x) * 0.7,
      dy: (slot.y + L.cardH / 2 - center.y) * 0.7,
      rot: rotationOf(i),
    });
    const transform = (s: { dx: number; dy: number; rot: number }, e: number) =>
      `translate3d(${s.dx * e}px, ${s.dy * e}px, 0) rotate(${s.rot * e}deg) scale(${1 - 0.28 * e})`;

    const before = measure(prev);
    const c0 = { x: el.clientWidth / 2, y: before.height / 2 };
    const out = outgoing.map((i) => ({ i, s: scatter(i, c0, before, before.slots.get(i)!) }));
    let incoming: { i: number; s: { dx: number; dy: number; rot: number } }[] = [];
    let swapped = false;
    const start = performance.now();

    const frame = (now: number) => {
      const t = now - start;
      if (t < OUT_MS) {
        const e = ease(t / OUT_MS);
        for (const { i, s } of out) {
          const card = cards[i]!;
          card.style.transform = transform(s, e);
          card.style.opacity = String(1 - e);
        }
      } else {
        if (!swapped) {
          // Nuevos lugares: las cartas entrantes arrancan dispersas e invisibles
          swapped = true;
          settle(next);
          const after = measure(next);
          const c1 = { x: el.clientWidth / 2, y: after.height / 2 };
          incoming = visibleOf(next).map((i) => ({ i, s: scatter(i, c1, after, after.slots.get(i)!) }));
          for (const { i, s } of incoming) {
            cards[i]!.style.transform = transform(s, 1);
            cards[i]!.style.opacity = '0';
          }
        }
        const p = Math.min(1, (t - OUT_MS) / IN_MS);
        const e = 1 - ease(p);
        for (const { i, s } of incoming) {
          const card = cards[i]!;
          card.style.transform = p >= 1 ? '' : transform(s, e);
          card.style.opacity = p >= 1 ? '1' : String(1 - e);
        }
        if (p >= 1) return;
      }
      raf.current = requestAnimationFrame(frame);
    };
    raf.current = requestAnimationFrame(frame);
  };

  return (
    <div className="scatter">
      <div className="scatter__filters" role="group" aria-label="Filtrar prendas">
        {filters.map((f) => (
          <button key={f.id} className="scatter__filter mono" aria-pressed={filter === f.id} onClick={() => choose(f.id)}>
            {f.label}
          </button>
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        {count} {count === 1 ? 'prenda' : 'prendas'}
      </p>
      <div ref={containerRef} className="scatter__grid">
        {items.map((p, i) => (
          <div key={p.id} ref={(el) => (cardRefs.current[i] = el)} className="scatter__card">
            <Link to={`/producto/${p.id}`} className="product-card">
              <span className="product-card__visual">
                <GarmentImage p={p} />
                {p.demo && <span className="tag tag--demo product-card__demo">Muestra</span>}
              </span>
              <span className="product-card__name">{p.name}</span>
              <span className="mono">
                {formatPrice(p.price)} · {p.colors.length} {p.colors.length === 1 ? 'color' : 'colores'}
              </span>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
