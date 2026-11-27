/**
 * Herramienta de desarrollo (no entra en el sitio publicado): dibuja una prenda 3D lisa sobre fondo
 * transparente, para generar las imágenes de producto. Se usa con `npm run dev` y scripts/render_garments.cjs.
 *
 * Parámetros: ?model=tee|hoodie&color=%23hex&yaw=0&pitch=0&w=1200&h=1400
 */
import {
  ACESFilmicToneMapping,
  Box3,
  DirectionalLight,
  Group,
  MathUtils,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { MODELS } from '../src/data/garmentModels';
import { buildGarment, loadGarmentGltf } from '../src/three/GarmentStudioScene';

const q = new URLSearchParams(location.search);
const num = (k: string, d: number) => (q.has(k) ? Number(q.get(k)) : d);

async function main() {
  const model = MODELS[(q.get('model') ?? 'tee') as 'tee' | 'hoodie']!;
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
  scene.environmentIntensity = num('env', 0.7);
  const key = new DirectionalLight(0xffffff, num('key', 1.2));
  key.position.set(-3, 5, 8);
  scene.add(key);

  const gltf = await loadGarmentGltf(model.url);
  const uniforms = { customRotation: { value: 0 }, intro: { value: 0 } };
  const built = await buildGarment(gltf, model, q.get('color') ?? '#ece6da', undefined, uniforms, 8);
  const rig = new Group();
  rig.add(built.group);
  scene.add(rig);
  const box = new Box3().setFromObject(built.group);
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  rig.rotation.y = MathUtils.degToRad(num('yaw', 0));
  rig.rotation.x = MathUtils.degToRad(num('pitch', 0));

  // Encuadre: la prenda completa con un margen parejo
  const cam = new PerspectiveCamera(22, W / H, 0.1, 100);
  const tan = Math.tan(MathUtils.degToRad(11));
  const d = Math.max(((size.y / 2) * 1.06) / tan, ((size.x / 2) * 1.06) / (tan * (W / H))) + size.z / 2;
  cam.position.set(center.x, center.y, d);
  cam.lookAt(center.x, center.y, 0);
  r.render(scene, cam);
  (window as unknown as { __done: boolean }).__done = true;
}

main();
