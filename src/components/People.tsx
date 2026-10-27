import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { demoOutfits } from '../data/drops';
import { getProduct, products } from '../data/products';
import type { Outfit } from '../data/types';
import { Garment } from './Garment';
import { Reveal } from './Reveal';
import { submitOutfit, type SubmitResult } from '../services/outfits';

const SAVED_KEY = 'bilair.saved-outfits.v1';

function readSaved(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]');
  } catch {
    return [];
  }
}

/** Composición tipo flat-lay con las prendas del outfit */
function FlatLay({ outfit }: { outfit: Outfit }) {
  return (
    <div className={`flatlay flatlay--${outfit.items.length}`}>
      {outfit.items.map(({ productId, colorId }, i) => {
        const p = getProduct(productId);
        if (!p) return null;
        const c = p.colors.find((x) => x.id === colorId) ?? p.colors[0];
        return (
          <div key={productId} className={`flatlay__item flatlay__item--${p.garment}`} style={{ ['--r' as string]: `${(i % 2 ? 1 : -1) * (3 + i * 2)}deg` }}>
            <Garment kind={p.garment} color={c.hex} ink={c.ink} title={`${p.name} ${c.name}`} />
          </div>
        );
      })}
    </div>
  );
}

function OutfitModal({ outfit, onClose }: { outfit: Outfit; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <motion.div className="modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className="modal__card modal__card--outfit"
        role="dialog"
        aria-modal="true"
        aria-label={`Outfit de ${outfit.alias}`}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__visual grain">
          <FlatLay outfit={outfit} />
        </div>
        <div className="modal__body">
          <div className="modal__top">
            <span className="tag tag--demo">Outfit de ejemplo</span>
            <button className="link" onClick={onClose} autoFocus>
              Cerrar
            </button>
          </div>
          <p className="display h-sm">{outfit.alias}</p>
          {outfit.city && <p className="mono">{outfit.city}</p>}
          <p>{outfit.caption}</p>
          <p className="mono modal__label">Prendas del look</p>
          <ul className="modal__items">
            {outfit.items.map(({ productId, colorId }) => {
              const p = getProduct(productId);
              if (!p) return null;
              const c = p.colors.find((x) => x.id === colorId) ?? p.colors[0];
              return (
                <li key={productId}>
                  <span className="modal__swatch" style={{ background: c.hex }} />
                  <span>{p.name}</span>
                  <span className="mono">{c.name}</span>
                  <Link to={`/producto/${p.id}`} className="link">
                    Ver
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ShareForm({ onClose }: { onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [alias, setAlias] = useState('');
  const [city, setCity] = useState('');
  const [caption, setCaption] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setResult(await submitOutfit({ image: file, alias, city, caption, productIds: picked, consent }));
  };

  return (
    <motion.div className="modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.form
        className="modal__card share"
        role="dialog"
        aria-modal="true"
        aria-label="Compartir mi outfit"
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
      >
        <div className="modal__top">
          <p className="display h-sm">Compartí tu outfit</p>
          <button type="button" className="link" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <label className="share__drop">
          {preview ? <img src={preview} alt="Vista previa de tu foto" /> : <span className="mono">Elegí una foto · JPG o PNG</span>}
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
        </label>
        <p className="mono share__note">La vista previa se genera en tu dispositivo. La foto no se envía hasta que publiques.</p>

        <div className="share__row">
          <label>
            <span className="mono">Alias</span>
            <input value={alias} onChange={(e) => setAlias(e.target.value)} required maxLength={30} placeholder="@tuusuario" />
          </label>
          <label>
            <span className="mono">Ciudad (opcional)</span>
            <input value={city} onChange={(e) => setCity(e.target.value)} maxLength={40} placeholder="¿Dónde fue?" />
          </label>
        </div>
        <label>
          <span className="mono">Descripción</span>
          <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} maxLength={240} />
        </label>
        <fieldset>
          <legend className="mono">Prendas BILAIR que usaste</legend>
          <div className="fit__products">
            {products.map((p) => (
              <button
                type="button"
                key={p.id}
                className={`chip ${picked.includes(p.id) ? 'is-active' : ''}`}
                aria-pressed={picked.includes(p.id)}
                onClick={() => setPicked((v) => (v.includes(p.id) ? v.filter((x) => x !== p.id) : [...v, p.id]))}
              >
                {p.name}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="share__consent">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
          <span>Acepto que BILAIR revise mi foto antes de publicarla. Nada se publica automáticamente.</span>
        </label>

        {result && !result.ok && result.reason === 'no-backend' ? (
          <p className="share__result" role="status">
            Todavía no podemos recibir publicaciones: la comunidad abre pronto. Tu foto <strong>no salió de tu dispositivo</strong>.
          </p>
        ) : (
          <button className="btn btn--block" type="submit" disabled={!file || !alias.trim() || !consent}>
            Enviar para revisión
          </button>
        )}
      </motion.form>
    </motion.div>
  );
}

export function People() {
  const [open, setOpen] = useState<Outfit | null>(null);
  const [sharing, setSharing] = useState(false);
  const [saved, setSaved] = useState<string[]>(readSaved);

  const toggleSave = (id: string) =>
    setSaved((v) => {
      const next = v.includes(id) ? v.filter((x) => x !== id) : [...v, id];
      try {
        localStorage.setItem(SAVED_KEY, JSON.stringify(next));
      } catch {
        /* sin almacenamiento */
      }
      return next;
    });

  return (
    <div className="people">
      <div className="people__bar">
        <p className="mono people__note">
          <span className="tag tag--demo">Ejemplos</span> Estos looks son de demostración, no publicaciones de personas reales. Los guardados quedan en tu
          navegador.
        </p>
        <button className="btn btn--accent" onClick={() => setSharing(true)}>
          Compartir mi outfit <span className="arrow">→</span>
        </button>
      </div>

      <ul className="people__grid">
        {demoOutfits.map((o, i) => (
          <Reveal as="li" key={o.id} delay={(i % 3) * 90} className={`look look--${i}`}>
            <button className="look__visual grain" onClick={() => setOpen(o)} aria-label={`Ver outfit completo de ${o.alias}`}>
              <FlatLay outfit={o} />
              <span className="tag tag--demo look__badge">Ejemplo</span>
            </button>
            <div className="look__meta">
              <div>
                <p className="look__alias">{o.alias}</p>
                {o.city && <p className="mono">{o.city}</p>}
              </div>
              <button className={`look__save mono ${saved.includes(o.id) ? 'is-on' : ''}`} onClick={() => toggleSave(o.id)} aria-pressed={saved.includes(o.id)}>
                {saved.includes(o.id) ? '★ Guardado' : '☆ Guardar'}
              </button>
            </div>
            <ul className="look__tags">
              {o.items.map(({ productId }) => (
                <li key={productId} className="mono">
                  {getProduct(productId)?.name}
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </ul>

      <AnimatePresence>
        {open && <OutfitModal outfit={open} onClose={() => setOpen(null)} />}
        {sharing && <ShareForm onClose={() => setSharing(false)} />}
      </AnimatePresence>
    </div>
  );
}
