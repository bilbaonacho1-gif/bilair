import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { HomeHero } from '../components/HomeHero';
import { WorldMap } from '../components/WorldMap';
import { NextStop, type NextStopHandle } from '../components/NextStop';
import { Drops } from '../components/Drops';
import { Wardrobe } from '../components/Wardrobe';
import { VirtualFit } from '../components/VirtualFit';
import { People } from '../components/People';
import { Lookbook } from '../components/Lookbook';
import { Reveal } from '../components/Reveal';

function SectionHead({ index, label, title, aside }: { index: string; label: string; title: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <header className="section-head">
      <p className="section-head__index mono">
        <span>{index}</span>
        <span>{label}</span>
      </p>
      <Reveal className="section-head__title">
        <h2 className="display h-lg">{title}</h2>
      </Reveal>
      {aside && (
        <Reveal className="section-head__aside lede" delay={120}>
          {aside}
        </Reveal>
      )}
    </header>
  );
}

export function Home() {
  const voteRef = useRef<NextStopHandle>(null);
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const t = window.setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 120);
    return () => window.clearTimeout(t);
  }, [hash]);

  return (
    <>
      <HomeHero />

      <section id="destinos" className="section section--paper grain" aria-labelledby="destinos-title">
        <div className="wrap">
          <SectionHead
            index="01"
            label="World Map"
            title={
              <span id="destinos-title">
                Elegí el <span className="marker accent-word">próximo</span> destino
              </span>
            }
            aside="Cada ciudad es una parada del recorrido. Algunas ya tienen drop, otras esperan tu voto."
          />
          <WorldMap onVote={(id) => voteRef.current?.highlight(id)} />
        </div>
      </section>

      <section id="next-stop" className="section section--dark" aria-labelledby="next-title">
        <div className="wrap">
          <SectionHead
            index="02"
            label="Next Stop"
            title={<span id="next-title">Next stop</span>}
            aside="Votá la ciudad que querés que BILAIR visite después de Tokio."
          />
          <NextStop ref={voteRef} />
        </div>
      </section>

      <section id="drops" className="section" aria-labelledby="drops-title">
        <div className="wrap">
          <SectionHead index="03" label="Drops" title={<span id="drops-title">Cada ciudad, un drop</span>} />
          <Drops />
        </div>
      </section>

      <section id="ropero" className="section section--studio" aria-labelledby="ropero-title">
        <div className="wrap">
          <SectionHead
            index="04"
            label="The Digital Wardrobe"
            title={<span id="ropero-title">El ropero</span>}
            aside="Pasá las perchas, elegí una prenda y mirala de cerca. Las flechas del teclado también funcionan."
          />
          <Wardrobe />
        </div>
      </section>

      <section id="virtual-fit" className="section section--paper grain" aria-labelledby="fit-title">
        <div className="wrap">
          <SectionHead
            index="05"
            label="Virtual Fit"
            title={<span id="fit-title">Probate tu ropa</span>}
            aside="Elegí prenda, silueta y talle para ver una referencia de cómo te queda. Es ilustrativo, no una medición exacta."
          />
          <VirtualFit />
        </div>
      </section>

      <section id="people" className="section" aria-labelledby="people-title">
        <div className="wrap">
          <SectionHead
            index="06"
            label="BILAIR People"
            title={
              <span id="people-title">
                Buena gente <span className="marker accent-word">en todos lados</span>
              </span>
            }
          />
          <People />
        </div>
      </section>

      <section id="lookbook" className="section section--dark" aria-labelledby="lookbook-title">
        <div className="wrap">
          <SectionHead index="07" label="Lookbook" title={<span id="lookbook-title">Lookbook</span>} />
          <Lookbook />
        </div>
      </section>
    </>
  );
}
