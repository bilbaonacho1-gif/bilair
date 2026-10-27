/**
 * Votación del próximo destino.
 *
 * Dos modos, y la interfaz siempre sabe en cuál está:
 *  - "live": hay backend (/api/votes con Upstash Redis configurado en Vercel).
 *    Los votos son públicos y el servidor evita duplicados.
 *  - "demo": no hay backend. El voto se guarda solo en este navegador y
 *    no existe un conteo público. La interfaz lo indica claramente.
 */

export type VoteMode = 'live' | 'demo';

export interface VoteState {
  mode: VoteMode;
  counts: Record<string, number>;
  /** Destino votado por este visitante, si ya votó */
  myVote: string | null;
}

export interface VoteService {
  load(candidates: string[]): Promise<VoteState>;
  vote(destinationId: string): Promise<VoteState>;
}

const LOCAL_KEY = 'bilair.vote.demo.v1';

function localState(): VoteState {
  let myVote: string | null = null;
  try {
    myVote = localStorage.getItem(LOCAL_KEY);
  } catch {
    /* sin almacenamiento */
  }
  return { mode: 'demo', counts: myVote ? { [myVote]: 1 } : {}, myVote };
}

const demoService: VoteService = {
  async load() {
    return localState();
  },
  async vote(destinationId) {
    try {
      localStorage.setItem(LOCAL_KEY, destinationId);
    } catch {
      /* sin almacenamiento */
    }
    return { mode: 'demo', counts: { [destinationId]: 1 }, myVote: destinationId };
  },
};

const liveService: VoteService = {
  async load(candidates) {
    const res = await fetch(`/api/votes?c=${encodeURIComponent(candidates.join(','))}`, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    return { mode: 'live', counts: data.counts ?? {}, myVote: data.myVote ?? null };
  },
  async vote(destinationId) {
    const res = await fetch('/api/votes', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ destinationId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok && res.status !== 409) throw new Error(data.error ?? String(res.status));
    return { mode: 'live', counts: data.counts ?? {}, myVote: data.myVote ?? destinationId };
  },
};

/** Detecta si el backend está disponible; si no, cae al modo demo. */
export async function resolveVoteService(candidates: string[]): Promise<{ service: VoteService; state: VoteState }> {
  try {
    const ct = await fetch('/api/votes?probe=1', { headers: { accept: 'application/json' } });
    const isJson = ct.headers.get('content-type')?.includes('application/json');
    if (ct.ok && isJson) {
      const state = await liveService.load(candidates);
      return { service: liveService, state };
    }
  } catch {
    /* sin backend */
  }
  return { service: demoService, state: await demoService.load(candidates) };
}
