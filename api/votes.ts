/**
 * Vercel Function: votación persistente del próximo destino.
 *
 * Requiere Upstash Redis (Vercel → Storage → Upstash → conectar al proyecto),
 * que define KV_REST_API_URL y KV_REST_API_TOKEN. Sin esas variables responde 503
 * y el sitio usa el modo demostración.
 *
 * Duplicados: un voto por visitante, identificado con un hash de IP + navegador + sal.
 * Es una barrera razonable, no infalible. Para una votación con premios o
 * resultados vinculantes, exigir login (ver README).
 */

const CANDIDATES = new Set(['lisboa', 'new-york', 'mexico', 'bangkok']);
const BALLOT = 'next-stop-2026';

const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

async function redis(commands: (string | number)[][]) {
  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  return (await res.json()) as { result: unknown }[];
}

async function voterId(req: Request) {
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim();
  const ua = req.headers.get('user-agent') ?? '';
  const data = new TextEncoder().encode(`${process.env.VOTE_SALT ?? 'bilair'}|${ip}|${ua}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function snapshot(voter: string) {
  const ids = [...CANDIDATES];
  const out = await redis([...ids.map((id) => ['HGET', `votes:${BALLOT}`, id]), ['HGET', `voters:${BALLOT}`, voter]]);
  const counts: Record<string, number> = {};
  ids.forEach((id, i) => (counts[id] = Number(out[i].result ?? 0)));
  return { counts, myVote: (out[ids.length].result as string | null) ?? null };
}

export async function GET(req: Request) {
  if (!url || !token) return json({ error: 'votación sin backend configurado' }, 503);
  const voter = await voterId(req);
  return json({ mode: 'live', ...(await snapshot(voter)) });
}

export async function POST(req: Request) {
  if (!url || !token) return json({ error: 'votación sin backend configurado' }, 503);
  const body = await req.json().catch(() => ({}));
  const id = String(body.destinationId ?? '');
  if (!CANDIDATES.has(id)) return json({ error: 'destino inválido' }, 400);

  const voter = await voterId(req);
  // HSETNX: solo registra si este visitante todavía no votó
  const [set] = await redis([['HSETNX', `voters:${BALLOT}`, voter, id]]);
  if (set.result === 1) await redis([['HINCRBY', `votes:${BALLOT}`, id, 1]]);
  const state = await snapshot(voter);
  return json({ mode: 'live', ...state, duplicate: set.result !== 1 }, set.result === 1 ? 200 : 409);
}
