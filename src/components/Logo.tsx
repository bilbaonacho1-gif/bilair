/**
 * Wordmark BILAIR provisional (tipografía de trazo de marcador).
 * Reemplazar por el logo oficial en SVG cuando esté disponible.
 */
export function Logo({ size = 28, className = '' }: { size?: number | string; className?: string }) {
  return (
    <span className={`logo ${className}`} style={{ fontSize: size }} aria-label="BILAIR">
      <span aria-hidden="true">BILAIR</span>
      <svg className="logo__swoosh" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
        <path d="M2 7 Q 30 2 58 4" fill="none" stroke="var(--orange)" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
    </span>
  );
}
