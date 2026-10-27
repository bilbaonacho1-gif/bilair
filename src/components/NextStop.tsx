import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { destinations } from '../data/destinations';
import { resolveVoteService, type VoteService, type VoteState } from '../services/votes';
import { Photo, formatCoords } from './Photo';
import { Reveal } from './Reveal';

export interface NextStopHandle {
  highlight: (id: string) => void;
}

const candidates = destinations.filter((d) => d.status === 'voting');
const ids = candidates.map((d) => d.id);

export const NextStop = forwardRef<NextStopHandle>(function NextStop(_, ref) {
  const [service, setService] = useState<VoteService | null>(null);
  const [state, setState] = useState<VoteState | null>(null);
  const [choice, setChoice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    resolveVoteService(ids).then(({ service, state }) => {
      setService(service);
      setState(state);
      setChoice(state.myVote);
    });
  }, []);

  useImperativeHandle(ref, () => ({
    highlight(id) {
      if (!state?.myVote) setChoice(id);
      document.getElementById(`vote-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setFlash(null);
      requestAnimationFrame(() => setFlash(id));
    },
  }));

  const total = useMemo(() => (state ? Object.values(state.counts).reduce((a, b) => a + b, 0) : 0), [state]);
  const voted = !!state?.myVote;
  const demo = state?.mode === 'demo';

  const submit = async () => {
    if (!service || !choice || voted) return;
    setBusy(true);
    setError(null);
    try {
      setState(await service.vote(choice));
    } catch {
      setError('No pudimos registrar el voto. Probá de nuevo en un rato.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="nextstop">
      {state && (
        <p className={`nextstop__mode mono ${demo ? 'is-demo' : 'is-live'}`} role="note">
          {demo ? (
            <>
              <span className="tag tag--demo">Modo demostración</span> La votación pública todavía no está conectada. Tu elección se guarda solo en este
              navegador y no se suma a ningún conteo.
            </>
          ) : (
            <>
              <span className="tag tag--solid">En vivo</span> {total} {total === 1 ? 'voto' : 'votos'} registrados. Un voto por persona.
            </>
          )}
        </p>
      )}

      <ol className="nextstop__list" role="radiogroup" aria-label="Elegí la próxima ciudad">
        {candidates.map((d, i) => {
          const count = state?.counts[d.id] ?? 0;
          const share = total ? count / total : 0;
          const isChoice = choice === d.id;
          const isMine = state?.myVote === d.id;
          return (
            <Reveal
              as="li"
              key={d.id}
              delay={i * 80}
              className={`vote ${isChoice ? 'is-chosen' : ''} ${isMine ? 'is-mine' : ''} ${flash === d.id ? 'is-flash' : ''}`}
              id={`vote-${d.id}`}
            >
              <button className="vote__inner" role="radio" aria-checked={isChoice} disabled={voted} onClick={() => setChoice(d.id)}>
                <Photo media={d.photo} code={d.code} coords={formatCoords(d.lat, d.lon)} tone="dark" className="vote__photo" />
                <span className="vote__info">
                  <span className="mono vote__index">0{i + 1}</span>
                  <span className="display h-sm vote__city">{d.city}</span>
                  <span className="mono vote__country">{d.country}</span>
                </span>
                <span className="vote__meter" aria-hidden="true">
                  <span style={{ transform: `scaleX(${share})` }} />
                </span>
                <span className="vote__count mono">
                  {demo ? (isMine ? 'Tu voto' : '—') : `${count} ${count === 1 ? 'voto' : 'votos'} · ${Math.round(share * 100)}%`}
                </span>
                <span className="vote__radio" aria-hidden="true" />
              </button>
            </Reveal>
          );
        })}
      </ol>

      <div className="nextstop__foot">
        {voted ? (
          <p className="display h-sm nextstop__thanks">
            Votaste por {destinations.find((d) => d.id === state?.myVote)?.city}. <span className="marker">¡Gracias!</span>
          </p>
        ) : (
          <button className="btn btn--accent" onClick={submit} disabled={!choice || busy || !service}>
            {busy ? 'Registrando…' : choice ? `Votar por ${destinations.find((d) => d.id === choice)?.city}` : 'Elegí una ciudad'}
            <span className="arrow">→</span>
          </button>
        )}
        {error && (
          <p className="mono nextstop__error" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
});
