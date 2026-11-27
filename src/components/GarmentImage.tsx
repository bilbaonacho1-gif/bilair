import type { Product } from '../data/types';
import { Garment } from './Garment';
import { Photo } from './Photo';

/**
 * Imagen de una prenda: la foto real si el producto la tiene; si no, la imagen generada
 * desde su modelo 3D (lisa, en el color elegido).
 * Las imágenes se generan con scripts/render_garments.cjs y viven en public/media/garments.
 */

/** Tamaño de las imágenes generadas, por tipo de prenda */
const RENDERS: Partial<Record<Product['garment'], { colors: string[]; size: [number, number] }>> = {
  tee: { colors: ['off-white', 'negro', 'piedra'], size: [859, 900] },
  hoodie: { colors: ['verde', 'negro', 'piedra'], size: [883, 900] },
};

export function garmentRender(p: Product, colorId: string | undefined) {
  const r = RENDERS[p.garment];
  const c = p.colors.find((x) => x.id === colorId) ?? p.colors[0];
  if (!r || !r.colors.includes(c.id)) return null;
  return { src: `/media/garments/${p.garment}-${c.id}.webp`, width: r.size[0], height: r.size[1], color: c };
}

export function GarmentImage({ p, colorId, className = '' }: { p: Product; colorId?: string; className?: string }) {
  if (p.images.length) return <Photo media={p.images[0]} className="garment-photo" tone="paper" />;
  const r = garmentRender(p, colorId);
  const c = p.colors.find((x) => x.id === colorId) ?? p.colors[0];
  if (!r) return <Garment kind={p.garment} color={c.hex} ink={c.ink} title={`${p.name}, ${c.name}`} className={className} />;
  return (
    <img
      className={`garment-img ${className}`}
      src={r.src}
      width={r.width}
      height={r.height}
      alt={`${p.name}, ${c.name}`}
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  );
}
