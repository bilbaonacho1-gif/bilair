import { Link } from 'react-router-dom';
import { useCart } from '../services/cart';
import { CartLines } from '../components/CartDrawer';
import { formatPrice, site } from '../config/site';
import { getProduct } from '../data/products';

/**
 * Checkout: la compra se completa en la tienda oficial existente.
 * No se reemplaza ni se toca su proceso de pago.
 */
export function CartPage() {
  const cart = useCart();
  const lines = cart.lines.map((l) => ({ ...l, product: getProduct(l.productId)! })).filter((l) => l.product);
  const buyable = lines.filter((l) => !l.product.demo && l.product.storeUrl);
  const demoCount = lines.filter((l) => l.product.demo).length;

  const whatsappText = encodeURIComponent(
    `Hola BILAIR, quiero comprar:\n${buyable.map((l) => `• ${l.product.name} · ${l.product.colors.find((c) => c.id === l.colorId)?.name} · Talle ${l.size} · x${l.qty}`).join('\n')}`,
  );

  return (
    <section className="section cartpage">
      <div className="wrap cartpage__grid">
        <div>
          <p className="mono">Checkout</p>
          <h1 className="display h-lg">Tu valija</h1>
          <CartLines />
        </div>

        <aside className="cartpage__summary">
          <div className="ticket">
            <div className="ticket__row mono">
              <span>Pasajero</span>
              <span>Vos</span>
            </div>
            <div className="ticket__row mono">
              <span>Prendas</span>
              <span>{cart.count}</span>
            </div>
            <div className="ticket__row mono">
              <span>Subtotal</span>
              <span>{cart.subtotal ? formatPrice(cart.subtotal) : '—'}</span>
            </div>
            <div className="ticket__perforation" aria-hidden="true" />
            <p className="mono ticket__perks">{site.perks.slice(1).join(' · ')}</p>
          </div>

          {demoCount > 0 && (
            <p className="cartpage__warn">
              <span className="tag tag--demo">Catálogo de muestra</span> {demoCount === 1 ? 'Una prenda' : `${demoCount} prendas`} de tu valija{' '}
              {demoCount === 1 ? 'es' : 'son'} de muestra y no se {demoCount === 1 ? 'puede' : 'pueden'} comprar todavía.
            </p>
          )}

          {buyable.length > 0 ? (
            <>
              <p className="mono">La compra se completa en la tienda oficial, con sus medios de pago y envíos.</p>
              <ul className="cartpage__links">
                {buyable.map((l) => (
                  <li key={`${l.productId}-${l.colorId}-${l.size}`}>
                    <a className="btn btn--block" href={l.product.storeUrl} target="_blank" rel="noreferrer">
                      Comprar {l.product.name} · {l.size} <span className="arrow">↗</span>
                    </a>
                  </li>
                ))}
              </ul>
              {site.whatsapp && (
                <a className="btn btn--ghost btn--block" href={`https://wa.me/${site.whatsapp}?text=${whatsappText}`} target="_blank" rel="noreferrer">
                  Enviar pedido por WhatsApp
                </a>
              )}
            </>
          ) : (
            <a className="btn btn--block" href={site.storeUrl} target="_blank" rel="noreferrer">
              Ir a la tienda oficial <span className="arrow">↗</span>
            </a>
          )}
          <Link to="/#ropero" className="link">
            Seguir eligiendo
          </Link>
        </aside>
      </div>
    </section>
  );
}
