/**
 * Wordmark BILAIR provisional (Archivo, peso 900 y ancho 125, igual que en el fuselaje).
 * Reemplazar por el logo oficial en SVG cuando esté disponible.
 */
export function Logo({ size = 22, className = '' }: { size?: number | string; className?: string }) {
  return (
    <span className={`logo ${className}`} style={{ fontSize: size }} aria-label="BILAIR">
      <span aria-hidden="true">BILAIR</span>
    </span>
  );
}
