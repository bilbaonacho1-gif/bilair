/**
 * Envío de outfits a BILAIR People.
 *
 * No hay backend de publicaciones todavía: `submitOutfit` no envía nada y lo dice.
 * Cuando exista, el flujo previsto es: subir imagen a un storage privado →
 * crear la publicación en estado "pendiente" → moderación manual → publicación.
 * Nunca se publica automáticamente.
 */

export interface OutfitSubmission {
  image: File;
  alias: string;
  city?: string;
  caption: string;
  productIds: string[];
  consent: boolean;
}

export type SubmitResult = { ok: true; status: 'pending-review' } | { ok: false; reason: 'no-backend' | 'invalid' };

export const outfitsBackendEnabled = false;

export async function submitOutfit(data: OutfitSubmission): Promise<SubmitResult> {
  if (!data.consent || !data.alias.trim() || !data.image) return { ok: false, reason: 'invalid' };
  if (!outfitsBackendEnabled) return { ok: false, reason: 'no-backend' };
  // Integración futura: POST /api/outfits (multipart) → estado "pending-review"
  return { ok: false, reason: 'no-backend' };
}
