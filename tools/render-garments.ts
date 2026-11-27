/**
 * Herramienta de desarrollo (no entra en el sitio publicado): dibuja una prenda 3D lisa,
 * opcionalmente colgada de una percha, sobre fondo transparente, para generar las imágenes de producto.
 * Se usa con `npm run dev` y scripts/render_garments.cjs.
 *
 * Parámetros: ?model=tee|hoodie&color=%23hex&hang=1&yaw=0&pitch=0&w=1200&h=1400
 */
import {
  ACESFilmicToneMapping,
  Box3,
  CatmullRomCurve3,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  Shape,
  SRGBColorSpace,
  TubeGeometry,
  Vector3,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildGarment, loadGarmentGltf } from '../src/three/GarmentStudioScene';

const q = new URLSearchParams(location.search);
const num = (k: string, d: number) => (q.has(k) ? Number(q.get(k)) : d);

/** Dónde va la percha en cada modelo, en fracciones del alto/ancho de la prenda */
const HANG: Record<string, { url: string; neckY: number; z: number; span: number; drop: number; cm: number; stem: number }> = {
  tee: { url: '/models/garments/tee.glb', neckY: 0.93, z: 0, span: 0.52, drop: 0.045, cm: 72, stem: 0 },
  hoodie: { url: '/models/garments/hoodie.glb', neckY: 0.8, z: 0.06, span: 0.3, drop: 0.05, cm: 70, stem: 13 },
};

/** Percha de madera con gancho de acero. Origen: donde el gancho entra en la madera. `u` = unidades de escena por cm. */
function hanger(u: number, halfSpan: number, drop: number, stemCm: number) {
  const g = new Group();
  const wood = new MeshStandardMaterial({ color: '#c8a274', roughness: 0.55, metalness: 0 });
  const steel = new MeshStandardMaterial({ color: '#d5d8dc', roughness: 0.22, metalness: 1 });

  // Cuerpo: tabla curva (hombros), más gruesa en el centro
  const t = 3.4 * u; // alto de la tabla
  const s = new Shape();
  s.moveTo(-halfSpan, -drop);
  s.quadraticCurveTo(-halfSpan * 0.45, -drop * 0.1, 0, t * 0.35);
  s.quadraticCurveTo(halfSpan * 0.45, -drop * 0.1, halfSpan, -drop);
  s.quadraticCurveTo(halfSpan * 1.02, -drop - t * 0.5, halfSpan * 0.97, -drop - t * 0.8);
  s.quadraticCurveTo(halfSpan * 0.45, -t * 1.0 - drop * 0.1, 0, -t * 0.85);
  s.quadraticCurveTo(-halfSpan * 0.45, -t * 1.0 - drop * 0.1, -halfSpan * 0.97, -drop - t * 0.8);
  s.quadraticCurveTo(-halfSpan * 1.02, -drop - t * 0.5, -halfSpan, -drop);
  const depth = 1.3 * u;
  const body = new Mesh(
    new ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.35 * u, bevelSize: 0.35 * u, bevelSegments: 4, curveSegments: 32 }),
    wood,
  );
  body.position.z = -depth / 2;
  g.add(body);

  // Gancho: alambre de acero en forma de signo de pregunta
  const r = 3.6 * u;
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
  ].map(([x, y], i) => new Vector3(x * r, y * r + (i ? stemCm * u : 0), 0));
  const hook = new Mesh(new TubeGeometry(new CatmullRomCurve3(pts, false, 'centripetal'), 96, 0.5 * u, 16, false), steel);
  g.add(hook);
  // Arandela donde el gancho entra en la madera
  const collar = new Mesh(
    new TubeGeometry(new CatmullRomCurve3([new Vector3(0, t * 0.3, 0), new Vector3(0, t * 0.3 + 0.9 * u, 0)]), 2, 0.8 * u, 20, false),
    steel,
  );
  g.add(collar);
  return { group: g, top: 3.45 * r + stemCm * u + 0.5 * u };
}

async function main() {
  const name = q.get('model') ?? 'tee';
  const cfg = HANG[name];
  const W = num('w', 1200);
  const H = num('h', 1400);
  const canvas = document.getElementById('c') as HTMLCanvasElement;
  const r = new WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1);
  r.setSize(W, H, false);
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  r.outputColorSpace = SRGBColorSpace;
  r.toneMapping = ACESFilmicToneMapping;
  r.toneMappingExposure = num('exp', 1.05);
  r.setClearColor(0x000000, 0);

  const scene = new Scene();
  const pmrem = new PMREMGenerator(r);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = num('env', 0.85);
  const key = new DirectionalLight(0xffffff, num('key', 0.9));
  key.position.set(-3, 5, 8);
  scene.add(key);

  const gltf = await loadGarmentGltf(cfg.url);
  const uniforms = { customRotation: { value: 0 }, intro: { value: 0 } };
  const built = await buildGarment(gltf, { url: cfg.url, yaw: 0, printHeight: 0.6, printWidth: 0.3 }, q.get('color') ?? '#ece6da', undefined, uniforms, 8);
  const rig = new Group();
  rig.add(built.group);
  scene.add(rig);

  const box = new Box3().setFromObject(built.group);
  const size = box.getSize(new Vector3());
  let top = box.max.y;
  if (q.get('hang') === '1') {
    const u = size.y / cfg.cm;
    const h = hanger(u, (size.x * cfg.span) / 2, size.y * cfg.drop, num('stem', cfg.stem));
    h.group.position.set(0, box.min.y + size.y * num('neckY', cfg.neckY), size.z * num('z', cfg.z));
    rig.add(h.group);
    top = h.group.position.y + h.top;
  }
  rig.rotation.y = MathUtils.degToRad(num('yaw', 0));
  rig.rotation.x = MathUtils.degToRad(num('pitch', 0));

  // Encuadre: todo el conjunto (prenda + gancho) con un margen parejo
  const cam = new PerspectiveCamera(22, W / H, 0.1, 100);
  const cy = (top + box.min.y) / 2;
  const hh = ((top - box.min.y) / 2) * 1.06;
  const hw = (size.x / 2) * 1.06;
  const tan = Math.tan(MathUtils.degToRad(11));
  const d = Math.max(hh / tan, hw / (tan * (W / H))) / num('zoom', 1) + size.z / 2;
  cam.position.set(0, cy, d);
  cam.lookAt(0, cy, 0);
  r.render(scene, cam);
  (window as unknown as { __done: boolean }).__done = true;
}

main();
