import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { campaigns } from '../data/drops';
import { getProduct } from '../data/products';
import { Photo } from './Photo';
import { Reveal } from './Reveal';
import { usePrefersReducedMotion } from '../hooks/useReveal';

/** Parallax moderado: cada cuadro se desplaza un poco distinto al hacer scroll */
function useParallax(container: React.RefObject<HTMLElement>, disabled: boolean) {
  useEffect(() => {
    const el = container.current;
    if (!el || disabled) return;
    const frames = [...el.querySelectorAll<HTMLElement>('[data-depth]')];
    let raf = 0;
    const tick = () => {
      raf = 0;
      const vh = window.innerHeight;
      for (const f of frames) {
        const r = f.getBoundingClientRect();
        const center = (r.top + r.height / 2 - vh / 2) / vh;
        f.style.transform = `translate3d(0, ${(-center * Number(f.dataset.depth)).toFixed(1)}px, 0)`;
      }
    };
    const on = () => (raf ||= requestAnimationFrame(tick));
    window.addEventListener('scroll', on, { passive: true });
    tick();
    return () => {
      window.removeEventListener('scroll', on);
      cancelAnimationFrame(raf);
    };
  }, [container, disabled]);
}

export function Lookbook() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  useParallax(ref, reduced);

  return (
    <div ref={ref}>
      {campaigns.map((c) => (
        <article key={c.id} className="campaign">
          <div className="campaign__grid">
            {c.frames.map((f, i) => (
              <div key={i} className={`campaign__frame campaign__frame--${i}`} data-depth={[30, 70, 45, 90][i % 4]}>
                <Reveal img>
                  <Photo media={f} tone={i % 2 ? 'stone' : 'dark'} code={i === 0 ? 'BLR' : undefined} />
                </Reveal>
              </div>
            ))}
            <Reveal className="campaign__caption">
              <p className="mono">Campaña · {c.place}</p>
              <h3 className="display h-md">{c.title}</h3>
              <p className="mono campaign__label">En esta campaña</p>
              <ul className="campaign__products">
                {c.productIds.map((id) => {
                  const p = getProduct(id);
                  return p ? (
                    <li key={id}>
                      <Link to={`/producto/${id}`}>
                        {p.name} <span aria-hidden="true">→</span>
                      </Link>
                    </li>
                  ) : null;
                })}
              </ul>
              {c.provisional && <p className="mono campaign__pending">Cuadros pendientes de fotografía real</p>}
            </Reveal>
          </div>
        </article>
      ))}
    </div>
  );
}
