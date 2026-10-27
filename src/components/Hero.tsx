import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { usePrefersReducedMotion } from '../hooks/useReveal';
import type { PlaneScene } from '../three/PlaneScene';
import { site } from '../config/site';

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Alternativa liviana cuando no hay WebGL o el modelo no carga. */
function PlaneFallback() {
  return (
    <svg className="hero__fallback" viewBox="0 0 600 300" aria-hidden="true">
      <g fill="#f3efe8" transform="rotate(-10 300 150)">
        <path d="M60 150 C60 138 80 132 110 132 L470 132 C520 132 560 140 572 150 C560 160 520 168 470 168 L110 168 C80 168 60 162 60 150 Z" />
        <path d="M250 136 L330 40 L362 40 L318 136 Z M250 164 L330 260 L362 260 L318 164 Z" />
        <path d="M86 136 L64 86 L84 86 L120 136 Z" fill="#ff4f1a" />
      </g>
      <text x="300" y="162" textAnchor="middle" fontFamily="'Permanent Marker'" fontSize="24" fill="#161513" transform="rotate(-10 300 150)">
        BILAIR
      </text>
    </svg>
  );
}

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<PlaneScene | null>(null);
  const reduced = usePrefersReducedMotion();
  const [progress, setProgress] = useState(0);
  const [state, setState] = useState<'loading' | 'ready' | 'fallback'>('loading');

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return;
    if (!webglAvailable()) {
      setState('fallback');
      return;
    }
    let disposed = false;
    let cleanup = () => {};

    // three.js se carga en un chunk aparte para no bloquear el primer render
    import('../three/PlaneScene').then(({ PlaneScene }) => {
      if (disposed) return;
      const lowPower = window.matchMedia('(max-width: 760px)').matches || (navigator.hardwareConcurrency ?? 8) <= 4;
      const scene = new PlaneScene({
        canvas,
        modelUrl: '/models/bilair-a319.glb',
        lowPower,
        reducedMotion: reduced,
        onProgress: (r) => setProgress(r),
      });
      sceneRef.current = scene;
      scene
        .load()
        .then(() => !disposed && setState('ready'))
        .catch(() => !disposed && setState('fallback'));

      const onScroll = () => {
        const rect = section.getBoundingClientRect();
        const total = section.offsetHeight - window.innerHeight;
        const p = total > 0 ? -rect.top / total : 0;
        scene.setScroll(p);
        section.style.setProperty('--p', String(Math.min(Math.max(p, 0), 1)));
      };
      const onPointer = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse') return;
        scene.setPointer((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
      };
      // Solo renderiza mientras el hero está en pantalla
      const io = new IntersectionObserver(([en]) => (en.isIntersecting ? scene.start() : scene.stop()));
      io.observe(section);
      const onVisibility = () => (document.hidden ? scene.stop() : scene.start());

      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('pointermove', onPointer, { passive: true });
      document.addEventListener('visibilitychange', onVisibility);
      onScroll();
      cleanup = () => {
        io.disconnect();
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('pointermove', onPointer);
        document.removeEventListener('visibilitychange', onVisibility);
        scene.dispose();
      };
    });
    return () => {
      disposed = true;
      cleanup();
    };
  }, [reduced]);

  const explore = () => {
    sceneRef.current?.takeoff();
    window.setTimeout(() => document.getElementById('destinos')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }), reduced ? 0 : 450);
  };

  return (
    <section ref={sectionRef} className={`hero hero--${state}`} aria-label="El despegue">
      <div className="hero__sticky">
        <div className="hero__sky" aria-hidden="true" />
        <div className="hero__wordmark" aria-hidden="true">
          <Logo size="100%" />
        </div>
        <canvas ref={canvasRef} className="hero__canvas" aria-label="Avión BILAIR despegando sobre las nubes" role="img" />
        {state === 'fallback' && <PlaneFallback />}

        {state === 'loading' && (
          <div className="hero__loader mono" role="status" aria-live="polite">
            <span>Embarcando</span>
            <span className="hero__loader-bar">
              <span style={{ transform: `scaleX(${progress})` }} />
            </span>
            <span>{Math.round(progress * 100)}%</span>
          </div>
        )}

        <div className="hero__content wrap">
          <div className="hero__copy">
            <p className="mono hero__kicker">Streetwear · Travel · Culture · People</p>
            <h1 className="display h-lg hero__title">{site.tagline}</h1>
            <p className="hero__lede">Una marca que recorre el mundo. Cada ciudad, un drop.</p>
            <div className="hero__actions">
              <button className="btn btn--accent" onClick={explore}>
                Explorar destinos <span className="arrow">→</span>
              </button>
              <Link className="btn btn--ghost" to="/drops/drop-00">
                Descubrir el drop actual
              </Link>
            </div>
          </div>

          <aside className="hero__ticket" aria-label="Itinerario actual">
            <div className="ticket-mini">
              <div className="ticket-mini__row mono">
                <span>Boarding pass</span>
                <span>BLR 000</span>
              </div>
              <div className="ticket-mini__route">
                <div>
                  <strong className="display">EZE</strong>
                  <span className="mono">Buenos Aires</span>
                </div>
                <span className="ticket-mini__plane" aria-hidden="true">
                  ✈
                </span>
                <div>
                  <strong className="display">HND</strong>
                  <span className="mono">Tokio</span>
                </div>
              </div>
              <div className="ticket-mini__row mono">
                <span>Drop 00 · El Despegue</span>
                <span>Gate B</span>
              </div>
            </div>
          </aside>
        </div>

        <div className="hero__scroll mono" aria-hidden="true">
          <span>Scroll</span>
          <span className="hero__scroll-line" />
        </div>
      </div>
    </section>
  );
}
