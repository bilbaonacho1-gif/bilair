import type { Campaign, Drop, Outfit } from './types';

/** PROVISIONAL: nombres y relatos de drops a confirmar por la marca. */
export const drops: Drop[] = [
  {
    id: 'drop-00',
    number: '00',
    name: 'El Despegue',
    destinationId: 'buenos-aires',
    status: 'available',
    summary: 'El momento en que decidís salir de lo conocido. La primera parada del recorrido arranca en casa.',
    story: [
      'Todo viaje empieza con una valija a medio armar y una ciudad que te despide.',
      'El Drop 00 es Buenos Aires: la remera que usás para ir al aeropuerto, el buzo para el vuelo nocturno y la gorra que vuelve con sellos de otros lugares.',
    ],
    campaign: { alt: 'Campaña Drop 00 en Buenos Aires', provisional: true },
    productIds: ['remera-despegue', 'remera-coordenadas', 'hoodie-pista', 'jean-terminal', 'gorra-b'],
    provisional: true,
  },
  {
    id: 'drop-01',
    number: '01',
    name: 'Tokio',
    destinationId: 'tokyo',
    status: 'upcoming',
    summary: 'Próxima parada confirmada. Todavía no hay prendas publicadas.',
    story: ['La colección se presenta cuando el avión aterrice.'],
    campaign: { alt: 'Tokio, próximo destino', provisional: true },
    productIds: [],
    provisional: true,
  },
];

export function getDrop(id: string) {
  return drops.find((d) => d.id === id);
}

/** Outfits de DEMOSTRACIÓN: no son publicaciones de personas reales. */
export const demoOutfits: Outfit[] = [
  {
    id: 'o1',
    alias: 'Ejemplo A',
    city: 'Palermo, CABA',
    caption: 'Remera oversize, jean recto y gorra. Lo básico para salir a caminar.',
    items: [
      { productId: 'remera-despegue', colorId: 'off-white' },
      { productId: 'jean-terminal', colorId: 'denim' },
      { productId: 'gorra-b', colorId: 'negro' },
    ],
    demo: true,
  },
  {
    id: 'o2',
    alias: 'Ejemplo B',
    city: 'Aeroparque',
    caption: 'Hoodie y cargo para el vuelo de la mañana.',
    items: [
      { productId: 'hoodie-pista', colorId: 'verde' },
      { productId: 'cargo-equipaje', colorId: 'piedra' },
    ],
    demo: true,
  },
  {
    id: 'o3',
    alias: 'Ejemplo C',
    caption: 'Todo negro, bolso a mano.',
    items: [
      { productId: 'remera-coordenadas', colorId: 'negro' },
      { productId: 'cargo-equipaje', colorId: 'negro' },
      { productId: 'bolso-carry-on', colorId: 'negro' },
    ],
    demo: true,
  },
  {
    id: 'o4',
    alias: 'Ejemplo D',
    city: 'San Telmo, CABA',
    caption: 'Buzo arena con jean claro.',
    items: [
      { productId: 'buzo-escala', colorId: 'arena' },
      { productId: 'jean-terminal', colorId: 'denim' },
    ],
    demo: true,
  },
  {
    id: 'o5',
    alias: 'Ejemplo E',
    caption: 'Remera piedra y gorra off white.',
    items: [
      { productId: 'remera-despegue', colorId: 'piedra' },
      { productId: 'gorra-b', colorId: 'off-white' },
    ],
    demo: true,
  },
];

/** Campañas: los cuadros quedan como placeholders hasta tener fotos reales. */
export const campaigns: Campaign[] = [
  {
    id: 'c-despegue',
    title: 'Mismas ganas, nuevos destinos',
    place: 'Buenos Aires',
    frames: [
      { alt: 'Retrato urbano con remera BILAIR', provisional: true },
      { alt: 'Detalle de estampa en la espalda', provisional: true },
      { alt: 'Plano general en la calle', provisional: true },
      { alt: 'Detalle de gorra', provisional: true },
    ],
    productIds: ['remera-despegue', 'hoodie-pista', 'gorra-b'],
    provisional: true,
  },
];
