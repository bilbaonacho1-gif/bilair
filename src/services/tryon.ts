/**
 * Virtual Fit.
 *
 * Hoy existe un único proveedor: "layered", una representación ilustrativa por capas
 * (silueta + prenda escaladas con medidas). NO es una simulación física ni usa IA.
 *
 * Para integrar un servicio real de prueba virtual (con foto o avatar 3D) se implementa
 * otro TryOnProvider y se registra en `providers`. Cualquier foto personal debe pedirse
 * explícitamente y enviarse solo con consentimiento informado.
 */

export type Build = 'recta' | 'atletica' | 'curvas';

export interface FitInput {
  heightCm: number;
  weightKg: number;
  build: Build;
  usualSize: string;
  size: string;
  /** Contorno de pecho de la prenda en cm (ancho plano x 2) */
  garmentChestCm: number;
}

export type FitLabel = 'ajustado' | 'regular' | 'holgado' | 'muy holgado' | 'chico';

export interface FitEstimate {
  /** Contorno de pecho estimado del cuerpo en cm. Es una aproximación gruesa. */
  bodyChestCm: number;
  easeCm: number;
  label: FitLabel;
  /** Relación ancho prenda / ancho torso para dibujar la capa */
  widthRatio: number;
}

export interface TryOnProvider {
  id: string;
  name: string;
  /** true solo si el proveedor procesa fotos del usuario */
  usesPersonalPhoto: boolean;
  estimate(input: FitInput): FitEstimate;
}

const buildChestOffset: Record<Build, number> = { recta: 0, atletica: 5, curvas: 3 };

export const layeredProvider: TryOnProvider = {
  id: 'layered',
  name: 'Vista ilustrativa por capas',
  usesPersonalPhoto: false,
  estimate({ heightCm, weightKg, build, garmentChestCm }) {
    const bmi = weightKg / (heightCm / 100) ** 2;
    const bodyChestCm = Math.round(90 + (bmi - 22.5) * 2.6 + (heightCm - 175) * 0.22 + buildChestOffset[build]);
    const easeCm = Math.round(garmentChestCm - bodyChestCm);
    const label: FitLabel = easeCm < 2 ? 'chico' : easeCm < 10 ? 'ajustado' : easeCm < 20 ? 'regular' : easeCm < 32 ? 'holgado' : 'muy holgado';
    return { bodyChestCm, easeCm, label, widthRatio: garmentChestCm / bodyChestCm };
  },
};

export const providers: TryOnProvider[] = [layeredProvider];
