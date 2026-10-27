/**
 * Configuración comercial y de contacto.
 * Todo lo vacío se oculta en la interfaz: completar solo con datos reales.
 */
export const site = {
  name: 'BILAIR',
  tagline: 'A volar con Bilair.',
  /** Tienda actual donde se completa la compra. No se modifica el proceso de pago existente. */
  storeUrl: 'https://www.bilair.com.ar',
  /** Número en formato internacional sin "+" ni espacios, ej. 5491112345678 */
  whatsapp: '',
  instagram: '',
  email: '',
  /** Beneficios publicados hoy en la tienda */
  perks: ['A volar con Bilair', 'Envío gratis en Capital Federal', '3 cuotas sin interés'],
  /**
   * true mientras el catálogo sea de muestra. Muestra un aviso global y
   * bloquea la compra de productos demo.
   */
  catalogIsDemo: true,
} as const;

export function formatPrice(value: number | null): string {
  if (value == null) return 'Precio a confirmar';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);
}
