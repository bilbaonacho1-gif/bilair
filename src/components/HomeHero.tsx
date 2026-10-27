import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useIntroPhase } from './Intro';

/**
 * Primera escena de la home. Aparece por el hueco que abre el avión al final de la intro
 * (o directamente, si la intro ya se vio en esta sesión).
 */

const HERO_IMAGE = {
  src: '/media/hero/final-approach.jpg',
  alt: 'El avión BILAIR en aproximación final sobre el Río de la Plata, al atardecer',
  caption: 'LV-BLR · Final approach, Aeroparque',
};

export function HomeHero() {
  const phase = useIntroPhase();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const shown = mounted && phase !== 'intro';

  return (
    <section className={`home-hero ${shown ? 'is-shown' : ''}`} aria-label="BILAIR">
      <div className="home-hero__inner wrap">
        <div className="home-hero__copy">
          <p className="mono home-hero__kicker" style={{ ['--d' as string]: '0.35s' }}>
            <span className="home-hero__dot" /> Drop 00 · El Despegue
          </p>
          <h1 className="home-hero__title" style={{ ['--d' as string]: '0.45s' }}>
            Ropa para ir lejos.
          </h1>
          <p className="home-hero__lede" style={{ ['--d' as string]: '0.55s' }}>
            Streetwear de Buenos Aires que recorre el mundo. Cada ciudad, un drop.
          </p>
          <div className="home-hero__actions" style={{ ['--d' as string]: '0.65s' }}>
            <Link className="btn btn--light" to="/drops/drop-00">
              Ver el drop <span className="arrow">→</span>
            </Link>
            <a className="btn btn--ghost" href="#destinos">
              Explorar destinos
            </a>
          </div>
        </div>

        <div className="home-hero__frame">
          <figure className="home-hero__img">
            <img src={HERO_IMAGE.src} alt={HERO_IMAGE.alt} fetchPriority="high" />
            <figcaption className="mono">{HERO_IMAGE.caption}</figcaption>
          </figure>
        </div>
      </div>

      <p className="home-hero__wordmark" aria-hidden="true">
        {'BILAIR'.split('').map((ch, i) => (
          <span key={i} className="home-hero__letter">
            <span style={{ ['--d' as string]: `${0.05 + i * 0.06}s` }}>{ch}</span>
          </span>
        ))}
      </p>
    </section>
  );
}
