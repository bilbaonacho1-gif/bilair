import type { GarmentModel } from '../three/GarmentStudioScene';
import type { GarmentKind } from './types';

/**
 * Modelos 3D reales por tipo de prenda (CC BY 4.0, créditos en el footer).
 * El buzo viene con los brazos abiertos: `arms` le baja las mangas para que caiga natural.
 */
export const MODELS: Partial<Record<GarmentKind, GarmentModel>> = {
  tee: { url: '/models/garments/tee.glb', yaw: 0, printHeight: 0.7, printWidth: 0.42 },
  hoodie: { url: '/models/garments/hoodie.glb', yaw: 0, printHeight: 0.63, printWidth: 0.6, arms: { deg: 40, x: 1.0, y: 1.05, soft: 0.5 } },
};

/** Cómo cuelga cada prenda de su percha */
export interface HangConfig {
  /** Alto real de la prenda en cm (da la escala del ropero) */
  heightCm: number;
  /** Altura del cuello, donde apoya la percha, en unidades de la prenda (alto = 4, centro en 0) */
  neckY: number;
  /** Corrimiento del gancho hacia el frente, en unidades de la prenda */
  z: number;
  /** Ancho de la percha en cm y caída de sus hombros en cm */
  spanCm: number;
  dropCm: number;
  /** Largo extra del cuello del gancho, en cm */
  stemCm: number;
  /** Pose extra al colgarla (capucha baja) */
  hood?: GarmentModel['hood'];
}

export const HANG: Partial<Record<GarmentKind, HangConfig>> = {
  tee: { heightCm: 72, neckY: 1.72, z: 0, spanCm: 40, dropCm: 3.2, stemCm: 0 },
  hoodie: { heightCm: 70, neckY: 1.2, z: 0.05, spanCm: 42, dropCm: 3.5, stemCm: 3, hood: { y: 1.2, fold: 152, len: 0.72, front: 0.75 } },
};
