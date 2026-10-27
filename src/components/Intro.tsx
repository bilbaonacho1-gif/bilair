import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { IntroScene } from '../three/IntroScene';
import { TIMELINE } from '../three/timeline';

/**
 * Intro cinematográfica: se ve una vez por sesión y solo al entrar por la home.
 * Fases: "intro" (avión en pantalla) → "reveal" (el paso del avión abre la home) → "ready".
 * Con movimiento reducido, sin WebGL o si el modelo tarda demasiado, la home aparece directo.
 */

export type IntroPhase = 'intro' | 'reveal' | 'ready';

const IntroContext = createContext<IntroPhase>('ready');
export const useIntroPhase = () => useContext(IntroContext);

const SEEN_KEY = 'bilair.intro.seen';
const LOAD_TIMEOUT = 7000;

function shouldPlay() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  if (params.has('intro') || params.has('intro-still') || params.has('intro-frame')) return true;
  if (window.location.pathname !== '/') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  try {
    if (sessionStorage.getItem(SEEN_KEY)) return false;
  } catch {
    /* sin almacenamiento: se reproduce */
  }
  try {
    const c = document.createElement('canvas');
    if (!(c.getContext('webgl2') || c.getContext('webgl'))) return false;
  } catch {
    return false;
  }
  return true;
}

function isLowPower() {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return window.matchMedia('(max-width: 760px)').matches || (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
}

function IntroOverlay({ onPhase }: { onPhase: (p: IntroPhase) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<IntroScene | null>(null);
  const skippedRef = useRef(false);
  const [progress, setProgress] = useState(0);
  const [state, setState] = useState<'loading' | 'playing' | 'reveal' | 'leaving'>('loading');

  const finish = () => {
    onPhase('ready');
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let loaded = false;
    // Si el modelo tarda demasiado (conexión lenta), no se retiene a nadie: se pasa a la home
    const timeout = window.setTimeout(() => !loaded && skip(), LOAD_TIMEOUT);
    // Herramientas de revisión: ?intro-still=3.2 (cuadro limpio) o ?intro-frame=4.1 (cuadro tal cual se ve)
    const params = new URLSearchParams(window.location.search);
    const still = params.get('intro-still') ?? params.get('intro-frame');

    import('../three/IntroScene')
      .then(async ({ IntroScene }) => {
        if (disposed) return;
        const scene = new IntroScene({ canvas, modelUrl: '/models/bilair-a319.glb', lowPower: isLowPower(), onProgress: setProgress });
        sceneRef.current = scene;
        await scene.load();
        if (disposed || skippedRef.current) return;
        loaded = true;
        window.clearTimeout(timeout);
        if (still) {
          scene.still(Number(still), params.has('intro-still'));
          if (params.has('intro-frame') && Number(still) >= TIMELINE.reveal) onPhase('reveal');
          setState('playing');
          return;
        }
        try {
          sessionStorage.setItem(SEEN_KEY, '1');
        } catch {
          /* sin almacenamiento */
        }
        setState('playing');
        scene.play({
          onReveal: () => {
            setState('reveal');
            onPhase('reveal');
          },
          onEnd: finish,
        });
      })
      .catch(() => !disposed && skip());

    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && skip();
    window.addEventListener('keydown', onKey);
    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      window.removeEventListener('keydown', onKey);
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function skip() {
    // Corta la escena para que sus callbacks no vuelvan a abrir la intro
    if (skippedRef.current) return;
    skippedRef.current = true;
    sceneRef.current?.stop();
    try {
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* sin almacenamiento */
    }
    setState('leaving');
    onPhase('reveal');
    window.setTimeout(finish, 650);
  }

  return (
    <div className={`intro intro--${state}`} aria-hidden={state === 'reveal' || state === 'leaving'}>
      <canvas
        ref={canvasRef}
        className="intro__canvas"
        role="img"
        aria-label="Un avión BILAIR se acerca con las luces de aterrizaje encendidas y pasa sobre la cámara"
      />
      <div className="intro__bars" aria-hidden="true">
        <span />
        <span />
      </div>
      {state === 'loading' && (
        <div className="intro__loader mono" role="status">
          <span>Final approach</span>
          <span className="intro__loader-bar">
            <span style={{ transform: `scaleX(${progress})` }} />
          </span>
        </div>
      )}
      <p className="intro__caption mono" aria-hidden="true">
        <span>Aeroparque · Buenos Aires</span>
        <span>34°33′ S 58°25′ O</span>
      </p>
      <button className="intro__skip mono" onClick={skip}>
        Saltar intro
      </button>
    </div>
  );
}

export function IntroProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<IntroPhase>(() => (shouldPlay() ? 'intro' : 'ready'));

  useEffect(() => {
    document.documentElement.classList.toggle('is-intro', phase !== 'ready');
  }, [phase]);

  return (
    <IntroContext.Provider value={phase}>
      {children}
      {phase !== 'ready' && <IntroOverlay onPhase={setPhase} />}
    </IntroContext.Provider>
  );
}
