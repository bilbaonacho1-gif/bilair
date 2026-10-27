import type { Destination } from './types';

/**
 * Paradas del BILAIR World Tour.
 * PROVISIONAL: estados, textos y fotos a confirmar por la marca.
 * Solo Buenos Aires tiene drop asociado; el resto no muestra colecciones que no existen.
 */
export const destinations: Destination[] = [
  {
    id: 'buenos-aires',
    city: 'Buenos Aires',
    country: 'Argentina',
    code: 'EZE',
    lat: -34.6037,
    lon: -58.3816,
    status: 'available',
    blurb: 'Donde empieza todo. Calles con veredas rotas, kioscos abiertos a las 3 AM y una ciudad que no sabe quedarse quieta.',
    dropId: 'drop-00',
    photo: { alt: 'Buenos Aires de noche', provisional: true },
  },
  {
    id: 'tokyo',
    city: 'Tokio',
    country: 'Japón',
    code: 'HND',
    lat: 35.6762,
    lon: 139.6503,
    status: 'next',
    blurb: 'Tradición y futuro en la misma cuadra. La próxima parada confirmada del recorrido.',
    eta: 'Próximo destino',
    photo: { alt: 'Calles de Tokio', provisional: true },
  },
  {
    id: 'lisboa',
    city: 'Lisboa',
    country: 'Portugal',
    code: 'LIS',
    lat: 38.7223,
    lon: -9.1393,
    status: 'voting',
    blurb: 'Tranvías amarillos, subidas imposibles y luz de atardecer todo el día.',
    photo: { alt: 'Lisboa', provisional: true },
  },
  {
    id: 'new-york',
    city: 'Nueva York',
    country: 'Estados Unidos',
    code: 'JFK',
    lat: 40.7128,
    lon: -74.006,
    status: 'voting',
    blurb: 'La capital del streetwear. Canchas de básquet, subte y esquinas con historia.',
    photo: { alt: 'Nueva York', provisional: true },
  },
  {
    id: 'mexico',
    city: 'Ciudad de México',
    country: 'México',
    code: 'MEX',
    lat: 19.4326,
    lon: -99.1332,
    status: 'voting',
    blurb: 'Color, mercados y una escena creativa que no para de crecer.',
    photo: { alt: 'Ciudad de México', provisional: true },
  },
  {
    id: 'bangkok',
    city: 'Bangkok',
    country: 'Tailandia',
    code: 'BKK',
    lat: 13.7563,
    lon: 100.5018,
    status: 'voting',
    blurb: 'Neón, calor y mercados nocturnos. Caos con estilo.',
    photo: { alt: 'Bangkok', provisional: true },
  },
  {
    id: 'paris',
    city: 'París',
    country: 'Francia',
    code: 'CDG',
    lat: 48.8566,
    lon: 2.3522,
    status: 'locked',
    blurb: 'Una parada que se desbloquea más adelante en el recorrido.',
    eta: 'Se desbloquea en 2027',
    photo: { alt: 'París', provisional: true },
  },
  {
    id: 'cape-town',
    city: 'Ciudad del Cabo',
    country: 'Sudáfrica',
    code: 'CPT',
    lat: -33.9249,
    lon: 18.4241,
    status: 'locked',
    blurb: 'Montaña, océano y una ciudad que mira al sur, como nosotros.',
    eta: 'Se desbloquea en 2027',
    photo: { alt: 'Ciudad del Cabo', provisional: true },
  },
  {
    id: 'seoul',
    city: 'Seúl',
    country: 'Corea del Sur',
    code: 'ICN',
    lat: 37.5665,
    lon: 126.978,
    status: 'locked',
    blurb: 'Moda callejera de otro planeta. Pendiente de ruta.',
    eta: 'Ruta pendiente',
    photo: { alt: 'Seúl', provisional: true },
  },
];

export const statusLabel: Record<Destination['status'], string> = {
  available: 'Drop disponible',
  next: 'Próximo destino',
  voting: 'En votación',
  locked: 'Destino bloqueado',
};

export function getDestination(id: string) {
  return destinations.find((d) => d.id === id);
}
