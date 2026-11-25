import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { site } from '../config/site';

export function Footer() {
  return (
    <footer className="footer section--dark">
      <div className="wrap footer__grid">
        <div className="footer__brand">
          <Logo size="clamp(64px, 14vw, 200px)" />
          <p className="mono">Travel · Culture · People</p>
        </div>
        <nav className="footer__col" aria-label="Sitio">
          <p className="mono footer__label">Recorrido</p>
          <Link to="/#destinos">Destinos</Link>
          <Link to="/#drops">Drops</Link>
          <Link to="/#ropero">Ropero</Link>
          <Link to="/#virtual-fit">Virtual Fit</Link>
          <Link to="/#people">People</Link>
        </nav>
        <nav className="footer__col" aria-label="Tienda">
          <p className="mono footer__label">Tienda</p>
          <a href={site.storeUrl} target="_blank" rel="noreferrer">
            Tienda oficial
          </a>
          <Link to="/carrito">Carrito</Link>
          {site.instagram && (
            <a href={`https://instagram.com/${site.instagram}`} target="_blank" rel="noreferrer">
              Instagram
            </a>
          )}
          {site.whatsapp && (
            <a href={`https://wa.me/${site.whatsapp}`} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          )}
        </nav>
        <div className="footer__col">
          <p className="mono footer__label">Beneficios</p>
          {site.perks.slice(1).map((p) => (
            <span key={p}>{p}</span>
          ))}
        </div>
      </div>
      <div className="wrap footer__legal mono">
        <span>© {new Date().getFullYear()} BILAIR</span>
        <span>
          Modelo 3D: “Airbus A319” de{' '}
          <a href="https://sketchfab.com/3d-models/airbus-a319-pincel-de-alas-1a63d67a03be499393f2171f646ccecf" target="_blank" rel="noreferrer">
            Pincel de Alas
          </a>
          , licencia{' '}
          <a href="http://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
            CC BY 4.0
          </a>
          , librea modificada para BILAIR. Prendas 3D: “Remera modelo 3d” de{' '}
          <a
            href="https://sketchfab.com/3d-models/remera-modelo-3d-creditos-a-quien-corresponda-4032c6e3868f4000867897cea1217cf2"
            target="_blank"
            rel="noreferrer"
          >
            isimo
          </a>{' '}
          y buzo con capucha de{' '}
          <a href="https://sketchfab.com/3d-models/sweater-nike-sportswear-club-fleece-bc387203ef184f2dbd25b236945857c5" target="_blank" rel="noreferrer">
            PKY_studio
          </a>
          , CC BY 4.0, recoloreadas, con estampado BILAIR y sin logos de terceros.
        </span>
      </div>
    </footer>
  );
}
