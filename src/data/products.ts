import type { Category, Product, ProductColor } from './types';

/**
 * CATÁLOGO DE MUESTRA.
 * Estos productos existen solo para poder diseñar y probar el ropero, la ficha y el carrito.
 * No tienen precio ni stock reales y no se pueden comprar (demo: true).
 * Reemplazar por el catálogo real exportado de la tienda (ver README → "Cargar el catálogo real").
 */

const black: ProductColor = { id: 'negro', name: 'Negro', hex: '#1b1a18', ink: '#f3efe8' };
const offWhite: ProductColor = { id: 'off-white', name: 'Off white', hex: '#ece6da', ink: '#1b1a18' };
const stone: ProductColor = { id: 'piedra', name: 'Piedra', hex: '#9b958a', ink: '#1b1a18' };
const forest: ProductColor = { id: 'verde', name: 'Verde bosque', hex: '#2f3a30', ink: '#ece6da' };
const denim: ProductColor = { id: 'denim', name: 'Denim claro', hex: '#9fb2c4', ink: '#1b1a18' };
const sand: ProductColor = { id: 'arena', name: 'Arena', hex: '#cbbfa8', ink: '#1b1a18' };

const tops = (s: [number, number][]) => Object.fromEntries(['S', 'M', 'L', 'XL'].map((k, i) => [k, { chest: s[i][0], length: s[i][1] }]));

const sizes = (labels: string[]) => labels.map((label) => ({ label, stock: null }));

export const products: Product[] = [
  {
    id: 'remera-despegue',
    name: 'Remera Despegue',
    category: 'remeras',
    dropId: 'drop-00',
    price: null,
    currency: 'ARS',
    colors: [offWhite, black, stone],
    sizes: sizes(['S', 'M', 'L', 'XL']),
    description: 'Remera oversize con el logo BILAIR al frente. Pieza central del Drop 00.',
    details: ['Calce oversize', 'Estampa al frente', 'Composición a confirmar'],
    images: [],
    garment: 'tee',
    demo: true,
    measurements: tops([
      [56, 70],
      [59, 72],
      [62, 74],
      [65, 76],
    ]),
  },
  {
    id: 'remera-coordenadas',
    name: 'Remera Coordenadas',
    category: 'remeras',
    dropId: 'drop-00',
    price: null,
    currency: 'ARS',
    colors: [black, offWhite],
    sizes: sizes(['S', 'M', 'L', 'XL']),
    description: 'Remera con las coordenadas de Buenos Aires en la espalda.',
    details: ['Calce regular', 'Estampa en espalda', 'Composición a confirmar'],
    images: [],
    garment: 'tee',
    demo: true,
    measurements: tops([
      [52, 68],
      [55, 70],
      [58, 72],
      [61, 74],
    ]),
  },
  {
    id: 'hoodie-pista',
    name: 'Hoodie Pista',
    category: 'hoodies',
    dropId: 'drop-00',
    price: null,
    currency: 'ARS',
    colors: [forest, black, stone],
    sizes: sizes(['S', 'M', 'L', 'XL']),
    description: 'Buzo con capucha de frisa, bolsillo canguro y logo bordado.',
    details: ['Calce relajado', 'Bolsillo canguro', 'Composición a confirmar'],
    images: [],
    garment: 'hoodie',
    demo: true,
    measurements: tops([
      [60, 68],
      [63, 70],
      [66, 72],
      [69, 74],
    ]),
  },
  {
    id: 'buzo-escala',
    name: 'Buzo Escala',
    category: 'hoodies',
    price: null,
    currency: 'ARS',
    colors: [black, sand],
    sizes: sizes(['S', 'M', 'L', 'XL']),
    description: 'Buzo cuello redondo para los vuelos largos.',
    details: ['Calce regular', 'Puños y cintura rib', 'Composición a confirmar'],
    images: [],
    garment: 'crew',
    demo: true,
    measurements: tops([
      [56, 66],
      [59, 68],
      [62, 70],
      [65, 72],
    ]),
  },
  {
    id: 'jean-terminal',
    name: 'Jean Terminal',
    category: 'pantalones',
    dropId: 'drop-00',
    price: null,
    currency: 'ARS',
    colors: [denim, black],
    sizes: sizes(['38', '40', '42', '44']),
    description: 'Jean de calce recto, lavado claro.',
    details: ['Calce recto', 'Cinco bolsillos', 'Composición a confirmar'],
    images: [],
    garment: 'pants',
    demo: true,
  },
  {
    id: 'cargo-equipaje',
    name: 'Cargo Equipaje',
    category: 'pantalones',
    price: null,
    currency: 'ARS',
    colors: [stone, black],
    sizes: sizes(['38', '40', '42', '44']),
    description: 'Pantalón cargo con bolsillos laterales.',
    details: ['Calce amplio', 'Bolsillos cargo', 'Composición a confirmar'],
    images: [],
    garment: 'pants',
    demo: true,
  },
  {
    id: 'gorra-b',
    name: 'Gorra B.',
    category: 'accesorios',
    dropId: 'drop-00',
    price: null,
    currency: 'ARS',
    colors: [black, offWhite],
    sizes: sizes(['Único']),
    description: 'Gorra de seis paneles con la B bordada.',
    details: ['Talle único ajustable', 'Bordado frontal'],
    images: [],
    garment: 'cap',
    demo: true,
  },
  {
    id: 'bolso-carry-on',
    name: 'Bolso Carry-On',
    category: 'accesorios',
    price: null,
    currency: 'ARS',
    colors: [black],
    sizes: sizes(['Único']),
    description: 'Bolso de mano para escapadas cortas.',
    details: ['Medidas a confirmar'],
    images: [],
    garment: 'bag',
    demo: true,
  },
];

export const categories: { id: Category; label: string }[] = [
  { id: 'remeras', label: 'Remeras' },
  { id: 'hoodies', label: 'Hoodies' },
  { id: 'pantalones', label: 'Pantalones' },
  { id: 'accesorios', label: 'Accesorios' },
];

/** Solo las categorías que tienen productos cargados */
export const availableCategories = categories.filter((c) => products.some((p) => p.category === c.id));

export function getProduct(id: string) {
  return products.find((p) => p.id === id);
}

export function totalStock(p: Product): number | null {
  if (p.sizes.some((s) => s.stock == null)) return null;
  return p.sizes.reduce((n, s) => n + (s.stock ?? 0), 0);
}
