import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <section className="section notfound">
      <div className="wrap">
        <p className="mono">Error 404 · Vuelo no encontrado</p>
        <h1 className="display h-xl">Perdimos la conexión</h1>
        <p className="lede">Esta puerta de embarque no existe. Volvé al inicio y elegí otro destino.</p>
        <Link className="btn" to="/">
          Volver al inicio <span className="arrow">→</span>
        </Link>
      </div>
    </section>
  );
}
