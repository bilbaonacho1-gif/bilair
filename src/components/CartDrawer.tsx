import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useCart } from '../services/cart';
import { getProduct } from '../data/products';
import { formatPrice } from '../config/site';
import { Garment } from './Garment';

export function CartLines({ compact = false }: { compact?: boolean }) {
  const cart = useCart();
  if (!cart.lines.length) {
    return (
      <div className="cart-empty">
        <p className="display h-sm">Tu valija está vacía.</p>
        <p className="mono">Pasá por el ropero y elegí algo para el viaje.</p>
      </div>
    );
  }
  return (
    <ul className={`cart-lines ${compact ? 'cart-lines--compact' : ''}`}>
      {cart.lines.map((l, i) => {
        const p = getProduct(l.productId);
        if (!p) return null;
        const color = p.colors.find((c) => c.id === l.colorId) ?? p.colors[0];
        return (
          <li key={`${l.productId}-${l.colorId}-${l.size}`} className="cart-line">
            <div className="cart-line__thumb" style={{ background: 'var(--paper)' }}>
              <Garment kind={p.garment} color={color.hex} ink={color.ink} title={p.name} />
            </div>
            <div className="cart-line__info">
              <p className="cart-line__name">{p.name}</p>
              <p className="mono">
                {color.name} · Talle {l.size}
              </p>
              {p.demo && <span className="tag tag--demo">Muestra · no se puede comprar</span>}
              <div className="cart-line__qty">
                <button onClick={() => cart.setQty(i, l.qty - 1)} aria-label="Restar uno" disabled={l.qty <= 1}>
                  −
                </button>
                <span className="mono" aria-live="polite">
                  {l.qty}
                </span>
                <button onClick={() => cart.setQty(i, l.qty + 1)} aria-label="Sumar uno">
                  +
                </button>
              </div>
            </div>
            <div className="cart-line__end">
              <p className="mono">{formatPrice(p.price == null ? null : p.price * l.qty)}</p>
              <button className="link" onClick={() => cart.remove(i)}>
                Quitar
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function CartDrawer() {
  const cart = useCart();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(cart.close);
  closeRef.current = cart.close;

  useEffect(() => {
    if (!cart.isOpen) return;
    const prev = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus();
    };
  }, [cart.isOpen]);

  return (
    <AnimatePresence>
      {cart.isOpen && (
        <>
          <motion.div className="drawer-scrim" onClick={cart.close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.aside
            ref={panelRef}
            tabIndex={-1}
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Carrito"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.55 }}
          >
            <header className="drawer__head">
              <p className="mono">Equipaje · {cart.count}</p>
              <button className="link" onClick={cart.close}>
                Cerrar
              </button>
            </header>
            <div className="drawer__body">
              <CartLines compact />
            </div>
            {cart.lines.length > 0 && (
              <footer className="drawer__foot">
                <div className="drawer__total">
                  <span className="mono">Subtotal</span>
                  <span className="display h-sm">{cart.subtotal ? formatPrice(cart.subtotal) : '—'}</span>
                </div>
                {cart.hasUnpriced && <p className="mono drawer__note">Hay productos sin precio cargado.</p>}
                <Link to="/carrito" className="btn btn--block" onClick={cart.close}>
                  Continuar al checkout <span className="arrow">→</span>
                </Link>
              </footer>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
