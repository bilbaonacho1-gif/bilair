import { Link, useParams } from 'react-router-dom';
import { getDrop } from '../data/drops';
import { getDestination, statusLabel } from '../data/destinations';
import { getProduct } from '../data/products';
import { Photo, formatCoords } from '../components/Photo';
import { Reveal } from '../components/Reveal';
import { ScatterGrid } from '../components/ScatterGrid';
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
            {items.length > 0 ? <ScatterGrid items={items} /> : <p className="lede">Todavía no hay prendas publicadas para este destino.</p>}
          </div>
        </div>
      </section>
    </article>
  );
}
