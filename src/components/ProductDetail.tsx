import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../data/types';
import { formatPrice } from '../config/site';
import { useCart } from '../services/cart';
import { getDrop } from '../data/drops';
import { totalStock } from '../data/products';

interface Props {
  product: Product;
  colorId: string;
  onColor: (id: string) => void;
  /** Visual principal (ilustración o galería), lo provee el contenedor para poder animarlo */
  visual: ReactNode;
  onPrev?: () => void;
  onNext?: () => void;
  onClose?: () => void;
  headingLevel?: 'h1' | 'h2' | 'h3';
}

function stockLabel(stock: number | null) {
  if (stock == null) return null;
  if (stock === 0) return 'Agotado';
  if (stock <= 3) return `Últimas ${stock}`;
  return null;
}

export function ProductDetail({ product: p, colorId, onColor, visual, onPrev, onNext, onClose, headingLevel: H = 'h2' }: Props) {
  const cart = useCart();
  const [size, setSize] = useState<string | null>(p.sizes.length === 1 ? p.sizes[0].label : null);
  const [added, setAdded] = useState(false);
  const [tab, setTab] = useState<'desc' | 'talles'>('desc');

  useEffect(() => {
    setSize(p.sizes.length === 1 ? p.sizes[0].label : null);
    setAdded(false);
  }, [p.id, p.sizes]);

  const color = p.colors.find((c) => c.id === colorId) ?? p.colors[0];
  const drop = p.dropId ? getDrop(p.dropId) : undefined;
  const stock = totalStock(p);
  const sizeObj = p.sizes.find((s) => s.label === size);
  const soldOut = stock === 0 || sizeObj?.stock === 0;

  const add = () => {
    if (!size || soldOut) return;
    cart.add({ productId: p.id, colorId: color.id, size });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2200);
  };

  return (
    <div className="pdp">
      <div className="pdp__visual">
        {visual}
        {(onPrev || onNext) && (
          <div className="pdp__nav">
            <button onClick={onPrev} aria-label="Prenda anterior" className="mono">
              ← Anterior
            </button>
            <button onClick={onNext} aria-label="Prenda siguiente" className="mono">
              Siguiente →
            </button>
          </div>
        )}
      </div>

      <div className="pdp__info">
        <div className="pdp__top">
          {drop ? (
            <Link to={`/drops/${drop.id}`} className="mono pdp__drop">
              Drop {drop.number} · {drop.name}
            </Link>
          ) : (
            <span className="mono pdp__drop">Línea permanente</span>
          )}
          {onClose && (
            <button className="link" onClick={onClose}>
              Volver al ropero
            </button>
          )}
        </div>

        <H className="display h-md pdp__name">{p.name}</H>
        <p className="pdp__price display h-sm">{formatPrice(p.price)}</p>
        {p.demo && <p className="tag tag--demo pdp__demo">Prenda de muestra · datos a confirmar</p>}

        <fieldset className="pdp__field">
          <legend className="mono">
            Color · <strong>{color.name}</strong>
          </legend>
          <div className="swatches">
            {p.colors.map((c) => (
              <button
                key={c.id}
                className={`swatch ${c.id === color.id ? 'is-active' : ''}`}
                style={{ background: c.hex }}
                aria-label={c.name}
                aria-pressed={c.id === color.id}
                onClick={() => onColor(c.id)}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="pdp__field">
          <legend className="mono">Talle</legend>
          <div className="sizes">
            {p.sizes.map((s) => {
              const label = stockLabel(s.stock);
              return (
                <button
                  key={s.label}
                  className={`size ${size === s.label ? 'is-active' : ''}`}
                  aria-pressed={size === s.label}
                  disabled={s.stock === 0}
                  onClick={() => setSize(s.label)}
                >
                  {s.label}
                  {label && <small>{label}</small>}
                </button>
              );
            })}
          </div>
          <p className="mono pdp__stock">{stock == null ? 'Disponibilidad: sin dato de stock' : stock === 0 ? 'Sin stock' : 'En stock'}</p>
        </fieldset>

        <button className={`btn btn--block ${added ? 'btn--accent' : ''}`} onClick={add} disabled={!size || soldOut}>
          {added ? 'Agregado a tu valija ✓' : size ? 'Agregar al carrito' : 'Elegí un talle'}
        </button>
        <div className="pdp__secondary">
          {added && (
            <button className="link" onClick={cart.open}>
              Ver carrito
            </button>
          )}
          {p.measurements && (
            <Link className="link" to={`/?prenda=${p.id}#virtual-fit`}>
              Probar en Virtual Fit
            </Link>
          )}
          {p.storeUrl && (
            <a className="link" href={p.storeUrl} target="_blank" rel="noreferrer">
              Ver en la tienda
            </a>
          )}
        </div>

        <div className="pdp__tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'desc'} className="mono" onClick={() => setTab('desc')}>
            Descripción
          </button>
          {p.measurements && (
            <button role="tab" aria-selected={tab === 'talles'} className="mono" onClick={() => setTab('talles')}>
              Medidas
            </button>
          )}
        </div>
        {tab === 'desc' || !p.measurements ? (
          <div className="pdp__desc">
            <p>{p.description}</p>
            <ul>
              {p.details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>
        ) : (
          <table className="pdp__table mono">
            <caption className="sr-only">Medidas de la prenda en centímetros</caption>
            <thead>
              <tr>
                <th>Talle</th>
                <th>Ancho pecho</th>
                <th>Largo</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(p.measurements).map(([k, m]) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td>{m.chest} cm</td>
                  <td>{m.length} cm</td>
                </tr>
              ))}
            </tbody>
            {p.demo && (
              <tfoot>
                <tr>
                  <td colSpan={3}>Medidas de muestra</td>
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>
    </div>
  );
}
