import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from './Logo';
import { useCart } from '../services/cart';
import { site } from '../config/site';

const links = [
  { id: 'destinos', label: 'Destinos' },
  { id: 'drops', label: 'Drops' },
  { id: 'ropero', label: 'Ropero' },
  { id: 'virtual-fit', label: 'Virtual Fit' },
  { id: 'people', label: 'People' },
];

function Marquee() {
  const items = [...site.perks, ...site.perks];
  return (
    <div className="marquee mono" aria-label={site.perks.join(' · ')}>
      <div className="marquee__track" aria-hidden="true">
        {[0, 1].map((k) => (
          <span key={k} className="marquee__group">
            {items.map((p, i) => (
              <span key={i}>
                <span className="marquee__plane">✈</span> {p}
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Nav() {
  const cart = useCart();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Sobre el hero la barra es transparente; se vuelve sólida al salir de él
    const on = () => {
      const hero = document.querySelector('.hero');
      setScrolled(hero ? hero.getBoundingClientRect().bottom < 120 : window.scrollY > 24);
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    if (pathname !== '/') {
      navigate(`/#${id}`);
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    history.replaceState(null, '', `#${id}`);
  };

  const onHero = pathname === '/' && !scrolled;

  return (
    <>
      <a className="skip mono" href="#main">
        Saltar al contenido
      </a>
      <header className={`nav ${onHero ? 'nav--over' : ''} ${open ? 'nav--open' : ''}`}>
        <Marquee />
        <div className="nav__bar wrap">
          <Link to="/" className="nav__logo" aria-label="BILAIR, volver al inicio">
            <Logo size={30} />
          </Link>
          <nav className="nav__links" aria-label="Principal">
            {links.map((l) => (
              <a key={l.id} href={`/#${l.id}`} onClick={go(l.id)} className="nav__link mono">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="nav__actions">
            <a className="nav__store mono" href={site.storeUrl} target="_blank" rel="noreferrer">
              Tienda
            </a>
            <button className="nav__cart mono" onClick={cart.open} aria-label={`Carrito, ${cart.count} productos`}>
              Carrito <span className="nav__count">{cart.count}</span>
            </button>
            <button className="nav__burger" aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen((v) => !v)}>
              <span className="sr-only">{open ? 'Cerrar menú' : 'Abrir menú'}</span>
              <span aria-hidden="true" />
              <span aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <div id="mobile-menu" className={`menu ${open ? 'menu--open' : ''}`} hidden={!open}>
        <nav className="menu__links" aria-label="Menú móvil">
          {links.map((l, i) => (
            <a key={l.id} href={`/#${l.id}`} onClick={go(l.id)} className="menu__link display" style={{ transitionDelay: `${60 + i * 40}ms` }}>
              <span className="mono">0{i + 1}</span>
              {l.label}
            </a>
          ))}
          <NavLink to="/carrito" className="menu__link display">
            <span className="mono">0{links.length + 1}</span>Carrito ({cart.count})
          </NavLink>
        </nav>
        <a className="btn btn--light btn--block" href={site.storeUrl} target="_blank" rel="noreferrer">
          Ir a la tienda oficial
        </a>
      </div>
    </>
  );
}
