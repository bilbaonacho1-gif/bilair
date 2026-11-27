import { useEffect, useRef, useState, type ReactNode } from 'react';
import markerFontUrl from '@fontsource/permanent-marker/files/permanent-marker-latin-400-normal.woff2?url';
import type { Product } from '../data/types';
import type { GarmentArtwork, GarmentModel, GarmentSource, GarmentStudioScene } from '../three/GarmentStudioScene';
import { Garment, garmentBox } from './Garment';
import { usePrefersReducedMotion } from '../hooks/useReveal';

/**
 * Visor 3D de una prenda en la ficha del producto: se gira arrastrando, con zoom
 * (rueda o pellizco) y botones de frente, espalda y rotación.
 * Mientras carga, o si el dispositivo no soporta WebGL, se ve la ilustración plana.
 */

export const supports3D = (p: Product) => !p.images.length && ['tee', 'crew', 'hoodie'].includes(p.garment);

const ART_HEIGHT = 1024;

/**
 * Modelos 3D reales por tipo de prenda (CC BY 4.0, créditos en el footer).
 * Las prendas sin modelo usan el volumen inflado desde su ilustración.
 */
export const MODELS: Partial<Record<Product['garment'], GarmentModel>> = {
  tee: { url: '/models/garments/tee.glb', yaw: 0, printHeight: 0.7, printWidth: 0.42 },
  hoodie: { url: '/models/garments/hoodie.glb', yaw: 0, printHeight: 0.63, printWidth: 0.3 },
};

/** Estampado BILAIR sobre fondo transparente, para el calco del modelo */
export async function printCanvas(ink: string, globe: boolean) {
  try {
    await document.fonts.load("200px 'Permanent Marker'");
  } catch {
    /* usa la tipografía de respaldo */
  }
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = globe ? 760 : 420;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  ctx.translate(512, 210);
  ctx.rotate((-6 * Math.PI) / 180);
  ctx.font = "250px 'Permanent Marker', cursive";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('BILAIR', 0, 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (globe) {
    ctx.lineWidth = 9;
    ctx.translate(512, 560);
    const r = 150;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.ellipse(0, 0, r * 0.45, r, 0, 0, Math.PI * 2);
    ctx.moveTo(-r, 0);
    ctx.lineTo(r, 0);
    ctx.moveTo(-r * 0.86, -r * 0.45);
    ctx.lineTo(r * 0.86, -r * 0.45);
    ctx.moveTo(-r * 0.86, r * 0.45);
    ctx.lineTo(r * 0.86, r * 0.45);
    ctx.stroke();
  }
  return c;
}
let fontCss: Promise<string> | null = null;

/** La tipografía del estampado, embebida para que el SVG la use al rasterizarse */
function markerFontFace() {
  fontCss ??= fetch(markerFontUrl)
    .then((r) => r.blob())
    .then(
      (b) =>
        new Promise<string>((resolve) => {
          const fr = new FileReader();
          fr.onload = () => resolve(`@font-face{font-family:'Permanent Marker';src:url(${fr.result}) format('woff2');}`);
          fr.readAsDataURL(b);
        }),
    )
    .catch(() => '');
  return fontCss;
}

async function rasterize(svg: SVGSVGElement, aspect: number) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const w = Math.round(ART_HEIGHT * aspect);
  clone.setAttribute('width', String(w));
  clone.setAttribute('height', String(ART_HEIGHT));
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = await markerFontFace();
  clone.insertBefore(style, clone.firstChild);
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = w;
    c.height = ART_HEIGHT;
    c.getContext('2d')!.drawImage(img, 0, 0, w, ART_HEIGHT);
    return c;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function GarmentStudio({ product, colorId, fallback }: { product: Product; colorId: string; fallback: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<GarmentStudioScene | null>(null);
  const reduced = usePrefersReducedMotion();
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [side, setSide] = useState<'front' | 'back'>('front');

  const color = product.colors.find((c) => c.id === colorId) ?? product.colors[0];
  const box = garmentBox[product.garment];
  const aspect = box.w / box.h;

  const model = MODELS[product.garment];
  const source = async (): Promise<GarmentSource> =>
    model
      ? { type: 'model', model, color: color.hex, print: await printCanvas(color.ink, product.garment === 'tee') }
      : { type: 'inflated', artwork: await artwork(), aspect };

  const artwork = async (): Promise<GarmentArtwork> => {
    const f = frontRef.current!.querySelector('svg')!;
    const b = backRef.current!.querySelector('svg')!;
    const [front, back] = await Promise.all([rasterize(f, aspect), rasterize(b, aspect)]);
    return { front, back };
  };

  // Escena: se crea una vez por prenda y se libera al salir
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let cleanup = () => {};
    setState('loading');
    setSide('front');

    Promise.all([import('../three/GarmentStudioScene'), source()])
      .then(async ([{ GarmentStudioScene }, src]) => {
        if (disposed) return;
        const scene = new GarmentStudioScene({ canvas, source: src, reducedMotion: reduced });
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
        scene.start();

        const pointers = new Map<number, { x: number; y: number }>();
        let pinchDist = 0;
        const onDown = (e: PointerEvent) => {
          pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pointers.size === 2) {
            const [a, b] = [...pointers.values()];
            pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
          }
        };
        const onMove = (e: PointerEvent) => {
          const prev = pointers.get(e.pointerId);
          if (!prev) return;
          pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pointers.size === 1) {
            scene.drag(e.clientX - prev.x);
            setSide(scene.side);
          } else if (pointers.size === 2) {
            const [a, b] = [...pointers.values()];
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            scene.pinch(d - pinchDist);
            pinchDist = d;
          }
        };
        const onUp = (e: PointerEvent) => {
          pointers.delete(e.pointerId);
          pinchDist = 0;
        };
        // La rueda hace zoom sobre la prenda; en los topes deja pasar el scroll de la página
        const onWheel = (e: WheelEvent) => {
          if (scene.wheel(e.deltaY)) e.preventDefault();
        };
        const io = new IntersectionObserver(([en]) => (en.isIntersecting ? scene.start() : scene.stop()));
        io.observe(canvas);
        const onVisibility = () => (document.hidden ? scene.stop() : scene.start());

        canvas.addEventListener('pointerdown', onDown);
        window.addEventListener('pointermove', onMove, { passive: true });
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
        canvas.addEventListener('wheel', onWheel, { passive: false });
        document.addEventListener('visibilitychange', onVisibility);
        cleanup = () => {
          io.disconnect();
          canvas.removeEventListener('pointerdown', onDown);
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          window.removeEventListener('pointercancel', onUp);
          canvas.removeEventListener('wheel', onWheel);
          document.removeEventListener('visibilitychange', onVisibility);
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
  }, [product.id, reduced]);

  // Cambio de color: solo se reemplaza la textura
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || state !== 'ready') return;
    let cancelled = false;
    if (model) printCanvas(color.ink, product.garment === 'tee').then((print) => !cancelled && scene.setColor(color.hex, print));
    else artwork().then((art) => !cancelled && scene.setArtwork(art));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color.id]);

  const face = (s: 'front' | 'back') => {
    sceneRef.current?.face(s);
    setSide(s);
  };
  const rotate = (dir: 1 | -1) => {
    sceneRef.current?.rotateBy((dir * Math.PI) / 4);
    if (sceneRef.current) setSide(sceneRef.current.side);
  };

  return (
    <div className={`studio studio--${state}`}>
      <div className="studio__stage">
        <div className="studio__fallback">{fallback}</div>
        <canvas ref={canvasRef} className="studio__canvas" role="img" aria-label={`${product.name} en 3D, color ${color.name}. Arrastrá para girarla.`} />
        {state === 'loading' && <span className="studio__loading" aria-hidden="true" />}
      </div>

      {state === 'ready' && (
        <div className="studio__controls" role="group" aria-label="Vista 3D">
          <button className="mono" aria-pressed={side === 'front'} onClick={() => face('front')}>
            Frente
          </button>
          <button className="mono" aria-pressed={side === 'back'} onClick={() => face('back')}>
            Espalda
          </button>
          <span className="studio__sep" aria-hidden="true" />
          <button onClick={() => rotate(-1)} aria-label="Girar a la izquierda">
            ↺
          </button>
          <button onClick={() => rotate(1)} aria-label="Girar a la derecha">
            ↻
          </button>
        </div>
      )}
      {state === 'failed' && <p className="sr-only">No se pudo cargar la vista 3D; se muestra la ilustración.</p>}

      {/* Ilustraciones fuente para las texturas (no visibles) */}
      <div className="studio__src" aria-hidden="true">
        <div ref={frontRef}>
          <Garment kind={product.garment} color={color.hex} ink={color.ink} />
        </div>
        <div ref={backRef}>
          <Garment kind={product.garment} color={color.hex} ink={color.ink} print={false} back />
        </div>
      </div>
    </div>
  );
}
