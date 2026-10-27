import { Link } from 'react-router-dom';
import { drops } from '../data/drops';
import { getDestination } from '../data/destinations';
import { getProduct } from '../data/products';
import { Photo, formatCoords } from './Photo';
import { Reveal } from './Reveal';
import { Garment } from './Garment';

export function Drops() {
  return (
    <div className="drops">
      {drops.map((d, i) => {
        const dest = getDestination(d.destinationId)!;
        const items = d.productIds.map(getProduct).filter(Boolean);
        const available = d.status === 'available';
        return (
          <article key={d.id} className={`drop drop--${d.status} ${i % 2 ? 'drop--flip' : ''}`}>
            <Reveal img className="drop__photo">
              <Photo media={d.campaign} code={dest.code} coords={formatCoords(dest.lat, dest.lon)} tone={available ? 'dark' : 'stone'} />
            </Reveal>
            <Reveal className="drop__body" delay={120}>
              <div className="drop__meta">
                <span className={`tag ${available ? 'tag--accent' : ''}`}>{available ? 'Disponible' : 'Próximamente'}</span>
                <span className="mono">
                  {dest.city}, {dest.country}
                </span>
              </div>
              <p className="drop__number display" aria-hidden="true">
                {d.number}
              </p>
              <h3 className="display h-lg drop__name">{d.name}</h3>
              <p className="lede">{d.summary}</p>

              {items.length > 0 ? (
                <ul className="drop__items" aria-label="Prendas del drop">
                  {items.map((p) => (
                    <li key={p!.id}>
                      <Link to={`/producto/${p!.id}`} className="drop__item">
                        <span className="drop__thumb">
                          <Garment kind={p!.garment} color={p!.colors[0].hex} ink={p!.colors[0].ink} title={p!.name} />
                        </span>
                        <span className="mono">{p!.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mono drop__empty">Sin prendas publicadas todavía.</p>
              )}

              {available ? (
                <Link to={`/drops/${d.id}`} className="btn">
                  Ver colección <span className="arrow">→</span>
                </Link>
              ) : (
                <a href="#next-stop" className="btn btn--ghost">
                  Votá la parada siguiente
                </a>
              )}
              {d.provisional && <p className="mono drop__provisional">Relato y fotos provisionales</p>}
            </Reveal>
          </article>
        );
      })}
    </div>
  );
}
