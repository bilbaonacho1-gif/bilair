import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProduct } from '../data/products';
import { usePrefersReducedMotion } from '../hooks/useReveal';
import { CUTS, type SpotPhase } from '../three/hoodieCodeTimeline';
import type { HoodieCodeScene } from '../three/HoodieCodeScene';
import { MODELS, printCanvas } from './GarmentStudio';
import { Garment } from './Garment';

/**
 * "Hoodie Code": comercial de 10 s en tiempo real sobre fondo blanco.
 * El visitante saca de cuadro el buzo negro con un swipe (o se va solo) y entra el buzo del color destacado.
 * La tipografía gigante vive detrás del canvas transparente.
 */

const PRODUCT_ID = 'hoodie-pista';
const FROM = 'negro';
const TO = 'verde';

const WORDS: Partial<Record<SpotPhase, string>> = {
  oversized: 'Oversized',
  street: 'Street',
  iconic: 'Iconic',
};

const CALLOUTS: Partial<Record<SpotPhase, string>> = {
  macro: 'Logo bordado',
  detail: 'Capucha',
};

const fmt = (t: number) => `00:${Math.min(t, CUTS.end).toFixed(1).padStart(4, '0')}`;

export function HoodieCode() {
  const product = getProduct(PRODUCT_ID)!;
  const from = product.colors.find((c) => c.id === FROM) ?? product.colors[0];
  const to = product.colors.find((c) => c.id === TO) ?? product.colors[0];
  const codeWord = product.name.split(' ').slice(-1)[0];

  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const sceneRef = useRef<HoodieCodeScene | null>(null);
  const reduced = usePrefersReducedMotion();
  const [near, setNear] = useState(false);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [phase, setPhase] = useState<SpotPhase>('idle');

  // Carga diferida: recién cuando la sección se acerca a la pantalla
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '600px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    const model = MODELS.hoodie;
    if (!near || !canvas || !stage || !model) return;
    let disposed = false;
    let cleanup = () => {};
    setState('loading');

    Promise.all([import('../three/HoodieCodeScene'), printCanvas(from.ink, false), printCanvas(to.ink, false)])
      .then(async ([{ HoodieCodeScene }, printFrom, printTo]) => {
        if (disposed) return;
        const scene = new HoodieCodeScene({
          canvas,
          model,
          from: { color: from.hex, print: printFrom },
          to: { color: to.hex, print: printTo },
          reducedMotion: reduced,
          onPhase: setPhase,
          onTick: (t) => {
            if (timeRef.current) timeRef.current.textContent = fmt(t);
            if (barRef.current) barRef.current.style.transform = `scaleX(${Math.min(1, t / CUTS.end)})`;
          },
        });
        try {
          await scene.load();
        } catch (err) {
          scene.dispose();
          throw err;
        }
        if (disposed) {
          scene.dispose();
          return;
        }
        sceneRef.current = scene;
        setState('ready');
        const frame = new URLSearchParams(location.search).get('hc-frame');
        if (frame !== null) {
          scene.freeze(Number(frame));
          cleanup = () => scene.dispose();
          return;
        }

        const io = new IntersectionObserver(([e]) => scene.setVisible(e.isIntersecting), { threshold: 0.35 });
        io.observe(stage);
        const onVisibility = () => scene.setVisible(!document.hidden && stage.getBoundingClientRect().top < window.innerHeight);
        document.addEventListener('visibilitychange', onVisibility);

        // Swipe con el dedo o el mouse sobre el buzo negro
        let lastX = 0;
        let lastT = 0;
        let vel = 0;
        let id: number | null = null;
        const onDown = (e: PointerEvent) => {
          if (scene.playing) return;
          id = e.pointerId;
          lastX = e.clientX;
          lastT = e.timeStamp;
          vel = 0;
          scene.dragStart();
        };
        const onMove = (e: PointerEvent) => {
          if (e.pointerId !== id) return;
          const dx = e.clientX - lastX;
          const dt = Math.max(1, e.timeStamp - lastT);
          vel = vel * 0.6 + (dx / dt) * 0.4;
          lastX = e.clientX;
          lastT = e.timeStamp;
          scene.dragMove(dx);
        };
        const onUp = (e: PointerEvent) => {
          if (e.pointerId !== id) return;
          id = null;
          scene.dragEnd(vel);
        };
        stage.addEventListener('pointerdown', onDown);
        window.addEventListener('pointermove', onMove, { passive: true });
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);

        cleanup = () => {
          io.disconnect();
          document.removeEventListener('visibilitychange', onVisibility);
          stage.removeEventListener('pointerdown', onDown);
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          window.removeEventListener('pointercancel', onUp);
          scene.dispose();
        };
      })
      .catch(() => !disposed && setState('failed'));

    return () => {
      disposed = true;
      sceneRef.current = null;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [near, reduced]);

  const final = state === 'failed' || phase === 'hero' || phase === 'end';
  const word = state === 'failed' ? null : WORDS[phase];
  const callout = CALLOUTS[phase];

  return (
    <section id="hoodie-code" className={`hc hc--${state} hc--${phase}`} aria-labelledby="hc-title" style={{ ['--hc-color' as string]: to.hex }}>
      <h2 id="hc-title" className="sr-only">
        Hoodie Code: {product.name} en color {to.name.toLowerCase()}
      </h2>
      <div ref={stageRef} className="hc__stage">
        {/* Tipografía gigante, detrás de la prenda */}
        <div className="hc__type" aria-hidden="true">
          {word && (
            <span key={word} className="hc__word" style={{ ['--len' as string]: word.length }}>
              {word}
            </span>
          )}
          {final && (
            <span className="hc__word hc__word--code">
              <span>{codeWord}</span>
              <span>Code</span>
            </span>
          )}
        </div>

        {state === 'failed' && (
          <div className="hc__fallback">
            <Garment kind={product.garment} color={to.hex} ink={to.ink} title={product.name} />
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="hc__canvas"
          role="img"
          aria-label={`${product.name}: el buzo negro sale de cuadro y entra el buzo ${to.name.toLowerCase()}, que gira y se muestra de frente, de costado y de espalda.`}
        />

        {phase === 'split' && (
          <div className="hc__panels mono" aria-hidden="true">
            <span>Frente</span>
            <span>Lado</span>
            <span>Espalda</span>
          </div>
        )}
        {callout && (
          <p key={callout} className="hc__callout mono" aria-hidden="true">
            <span className="hc__reticle" />
            {callout}
          </p>
        )}

        <div className="hc__hud mono" aria-hidden="true">
          <span>BILAIR / Hoodie code</span>
          <span>{product.demo ? 'Muestra' : 'Drop 00'}</span>
        </div>
        <div className="hc__foot">
          <p className="hc__name mono">
            {product.name} · {to.name}
          </p>
          <div className="hc__mid">
            {state === 'ready' && phase === 'idle' && (
              <button className="hc__hint mono" onClick={() => sceneRef.current?.swipe()}>
                <span aria-hidden="true">←</span> Deslizá el buzo
              </button>
            )}
            {(phase === 'end' || state === 'failed') && (
              <div className="hc__cta">
                <Link className="btn" to={`/producto/${product.id}`}>
                  Ver {product.name}
                </Link>
                {state === 'ready' && !reduced && (
                  <button className="btn btn--ghost" onClick={() => sceneRef.current?.replay()}>
                    Repetir
                  </button>
                )}
              </div>
            )}
          </div>
          <p className="hc__time mono" aria-hidden="true">
            {state === 'ready' && !reduced && (
              <>
                <span ref={timeRef}>{fmt(0)}</span> / {fmt(CUTS.end)}
                <span className="hc__bar">
                  <span ref={barRef} />
                </span>
              </>
            )}
          </p>
        </div>

        {state === 'loading' && near && <span className="studio__loading" aria-hidden="true" />}
      </div>
    </section>
  );
}
