/**
 * Modelo de datos de BILAIR.
 * La interfaz solo lee estas estructuras; cuando haya backend o catálogo real
 * se reemplazan las fuentes en src/data/* sin tocar los componentes.
 */

/** Imagen con dirección de arte. Sin `src` se muestra un placeholder identificado. */
export interface Media {
  src?: string;
  alt: string;
  credit?: string;
  /** true = contenido provisional que hay que reemplazar por material real de BILAIR */
  provisional?: boolean;
}

export type DestinationStatus = 'available' | 'next' | 'voting' | 'locked';

export interface Destination {
  id: string;
  city: string;
  country: string;
  /** Código IATA del aeropuerto principal: se usa en tickets y marcadores */
  code: string;
  lat: number;
  lon: number;
  status: DestinationStatus;
  blurb: string;
  dropId?: string;
  /** Texto libre para destinos bloqueados o próximos, ej. "2027" */
  eta?: string;
  photo: Media;
}

export type DropStatus = 'available' | 'upcoming';

export interface Drop {
  id: string;
  number: string;
  name: string;
  destinationId: string;
  status: DropStatus;
  summary: string;
  story: string[];
  campaign: Media;
  productIds: string[];
  provisional: boolean;
}

export type Category = 'remeras' | 'hoodies' | 'pantalones' | 'accesorios';

export type GarmentKind = 'tee' | 'hoodie' | 'crew' | 'pants' | 'cap' | 'bag';

export interface ProductColor {
  id: string;
  name: string;
  hex: string;
  /** Color de la estampa sobre ese fondo */
  ink: string;
}

export interface SizeOption {
  label: string;
  /** null = sin dato de stock (no se inventa) */
  stock: number | null;
}

export interface Product {
  id: string;
  name: string;
  category: Category;
  dropId?: string;
  /** null = precio sin cargar */
  price: number | null;
  currency: 'ARS';
  colors: ProductColor[];
  sizes: SizeOption[];
  description: string;
  details: string[];
  images: Media[];
  /** Ilustración vectorial que se usa en el ropero y en Virtual Fit mientras no haya fotos */
  garment: GarmentKind;
  /** Ficha del producto en la tienda oficial (donde se paga) */
  storeUrl?: string;
  /** Producto de muestra: no se puede comprar y se marca en la interfaz */
  demo: boolean;
  /** Medidas de la prenda por talle (cm) para Virtual Fit */
  measurements?: Record<string, { chest: number; length: number }>;
}

export interface Outfit {
  id: string;
  alias: string;
  city?: string;
  caption: string;
  items: { productId: string; colorId: string }[];
  photo?: Media;
  /** Contenido de demostración: no es una publicación real */
  demo: boolean;
}

export interface Campaign {
  id: string;
  title: string;
  place: string;
  frames: Media[];
  productIds: string[];
  provisional: boolean;
}
