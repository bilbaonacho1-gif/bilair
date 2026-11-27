import { CatmullRomCurve3, ExtrudeGeometry, Group, Mesh, MeshStandardMaterial, Shape, TubeGeometry, Vector3 } from 'three';

/**
 * Percha de madera con gancho de acero, en centímetros.
 * Origen: donde el gancho entra en la madera. El gancho se devuelve aparte porque no gira con la prenda:
 * queda abrazando el barral mientras la prenda se da vuelta.
 */
export function buildHanger(spanCm: number, dropCm: number, stemCm: number) {
  const wood = new MeshStandardMaterial({ color: '#c8a274', roughness: 0.55, metalness: 0 });
  const steel = new MeshStandardMaterial({ color: '#d5d8dc', roughness: 0.22, metalness: 1 });
  const half = spanCm / 2;

  // Cuerpo: tabla curva (hombros), más gruesa en el centro
  const t = 3.4;
  const s = new Shape();
  s.moveTo(-half, -dropCm);
  s.quadraticCurveTo(-half * 0.45, -dropCm * 0.1, 0, t * 0.35);
  s.quadraticCurveTo(half * 0.45, -dropCm * 0.1, half, -dropCm);
  s.quadraticCurveTo(half * 1.02, -dropCm - t * 0.5, half * 0.97, -dropCm - t * 0.8);
  s.quadraticCurveTo(half * 0.45, -t - dropCm * 0.1, 0, -t * 0.85);
  s.quadraticCurveTo(-half * 0.45, -t - dropCm * 0.1, -half * 0.97, -dropCm - t * 0.8);
  s.quadraticCurveTo(-half * 1.02, -dropCm - t * 0.5, -half, -dropCm);
  const depth = 1.3;
  const body = new Group();
  const board = new Mesh(
    new ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.35, bevelSize: 0.35, bevelSegments: 3, curveSegments: 24 }),
    wood,
  );
  board.position.z = -depth / 2;
  const collar = new Mesh(new TubeGeometry(new CatmullRomCurve3([new Vector3(0, t * 0.3, 0), new Vector3(0, t * 0.3 + 0.9, 0)]), 2, 0.8, 16, false), steel);
  body.add(board, collar);

  // Gancho: alambre de acero en forma de signo de pregunta, en el plano que abraza el barral
  const r = 3.6;
  const pts = [
    [0, -0.3],
    [0, 0.9],
    [0.12, 1.45],
    [0.62, 1.75],
    [1, 2.45],
    [0.72, 3.15],
    [0, 3.45],
    [-0.72, 3.15],
    [-1, 2.45],
    [-0.9, 2.05],
  ].map(([x, y], i) => new Vector3(0, y * r + (i ? stemCm : 0), -x * r));
  const hook = new Mesh(new TubeGeometry(new CatmullRomCurve3(pts, false, 'centripetal'), 72, 0.45, 12, false), steel);

  /** Altura del punto más alto del alambre (por dentro apoya sobre el barral) */
  return { body, hook, top: 3.45 * r + stemCm };
}
