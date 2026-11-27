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
      'El Drop 00 es Buenos Aires: la remera que usás para ir al aeropuerto y el buzo para el vuelo nocturno.',
    ],
    campaign: { alt: 'Campaña Drop 00 en Buenos Aires', provisional: true },
    productIds: ['remera-despegue', 'remera-coordenadas', 'hoodie-pista'],
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
    caption: 'Remera oversize off white. Lo básico para salir a caminar.',
    items: [{ productId: 'remera-despegue', colorId: 'off-white' }],
    demo: true,
  },
  {
    id: 'o2',
    alias: 'Ejemplo B',
    city: 'Aeroparque',
    caption: 'Hoodie y remera para el vuelo de la mañana.',
    items: [
      { productId: 'hoodie-pista', colorId: 'verde' },
      { productId: 'remera-despegue', colorId: 'piedra' },
    ],
    demo: true,
  },
  {
    id: 'o3',
    alias: 'Ejemplo C',
    caption: 'Todo negro.',
    items: [
      { productId: 'remera-coordenadas', colorId: 'negro' },
      { productId: 'hoodie-pista', colorId: 'negro' },
    ],
    demo: true,
  },
  {
    id: 'o4',
    alias: 'Ejemplo D',
    city: 'San Telmo, CABA',
    caption: 'Hoodie piedra para la vuelta.',
    items: [{ productId: 'hoodie-pista', colorId: 'piedra' }],
    demo: true,
  },
  {
    id: 'o5',
    alias: 'Ejemplo E',
    caption: 'Remera off white sobre remera negra.',
    items: [
      { productId: 'remera-coordenadas', colorId: 'off-white' },
      { productId: 'remera-despegue', colorId: 'negro' },
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
      { alt: 'Detalle del buzo', provisional: true },
    ],
    productIds: ['remera-despegue', 'hoodie-pista'],
    provisional: true,
  },
];
