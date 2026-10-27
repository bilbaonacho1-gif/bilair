import { Link, useParams } from 'react-router-dom';
import { getDrop } from '../data/drops';
import { getDestination, statusLabel } from '../data/destinations';
import { getProduct } from '../data/products';
import { formatPrice } from '../config/site';
import { Photo, formatCoords } from '../components/Photo';
import { Garment } from '../components/Garment';
import { Reveal } from '../components/Reveal';
import { NotFound } from './NotFound';

export function DropPage() {
  const { id = '' } = useParams();
  const drop = getDrop(id);
  if (!drop) return <NotFound />;
  const dest = getDestination(drop.destinationId)!;
  const items = drop.productIds.map(getProduct).filter((p) => !!p);

  return (
    <article className="droppage">
      <header className="droppage__hero section--dark">
        <Photo media={drop.campaign} code={dest.code} coords={formatCoords(dest.lat, dest.lon)} tone="dark" className="droppage__photo" priority />
        <div className="wrap droppage__head">
          <p className="mono">
            Drop {drop.number} · {dest.city}, {dest.country} · {statusLabel[dest.status]}
          </p>
          <h1 className="display h-xl">{drop.name}</h1>
          <p className="lede">{drop.summary}</p>
        </div>
      </header>

      <section className="section">
        <div className="wrap droppage__grid">
          <Reveal className="droppage__story">
            <p className="mono">La historia</p>
            {drop.story.map((s) => (
              <p key={s} className="droppage__para">
                {s}
              </p>
            ))}
            {drop.provisional && <p className="tag tag--demo">Relato provisional</p>}
          </Reveal>

          <div className="droppage__products">
            <div className="droppage__products-head">
              <p className="mono">{items.length ? `${items.length} prendas` : 'Colección en preparación'}</p>
              <Link to="/#ropero" className="link">
                Abrir en el ropero
              </Link>
            </div>
            {items.length > 0 ? (
              <ul className="product-grid">
                {items.map((p, i) => (
                  <Reveal as="li" key={p.id} delay={i * 70}>
                    <Link to={`/producto/${p.id}`} className="product-card">
                      <span className="product-card__visual">
                        <Garment kind={p.garment} color={p.colors[0].hex} ink={p.colors[0].ink} title={p.name} />
                        {p.demo && <span className="tag tag--demo product-card__demo">Muestra</span>}
                      </span>
                      <span className="product-card__name">{p.name}</span>
                      <span className="mono">
                        {formatPrice(p.price)} · {p.colors.length} {p.colors.length === 1 ? 'color' : 'colores'}
                      </span>
                    </Link>
                  </Reveal>
                ))}
              </ul>
            ) : (
              <p className="lede">Todavía no hay prendas publicadas para este destino.</p>
            )}
          </div>
        </div>
      </section>
    </article>
  );
}
