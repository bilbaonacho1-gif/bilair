import {
  ACESFilmicToneMapping,
  Box3,
  Euler,
  Raycaster,
  Vector3,
  BufferAttribute,
  CanvasTexture,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
  type BufferGeometry,
  type IUniform,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * Estudio 3D de una prenda BILAIR.
 *
 * La prenda es un volumen de tela "inflado" a partir de su silueta (frente y espalda),
 * con la ilustración del producto como textura. Un shader de vértices la tuerce y la dobla
 * como tela al arrastrar, siguiendo el controlador de prendas de referencia:
 * twist en Y, desplazamiento radial y curva en X durante la entrada.
 */

export interface GarmentArtwork {
  front: HTMLCanvasElement;
  back: HTMLCanvasElement;
}

/** Modelo 3D real de la prenda (glTF), teñido con el color del producto y con el estampado aplicado como calco */
export interface GarmentModel {
  url: string;
  /** Giro en Y para que el frente del modelo mire a la cámara */
  yaw: number;
  /** Centro del estampado en el pecho, como fracción del alto (0 = abajo, 1 = arriba) */
  printHeight: number;
  /** Ancho del estampado como fracción del ancho de la prenda */
  printWidth: number;
}

export type GarmentSource =
  | { type: 'inflated'; artwork: GarmentArtwork; aspect: number }
  | { type: 'model'; model: GarmentModel; color: string; print: HTMLCanvasElement };

export interface GarmentStudioOptions {
  canvas: HTMLCanvasElement;
  source: GarmentSource;
  reducedMotion: boolean;
}

const SIZE = 4; // alto de la prenda en unidades de escena, igual que en el shader de referencia
const ZOOM_MIN = -0.6;
const ZOOM_MAX = 2.4;
const PIXEL_RATIO_CAP = 1.5;

/** Campo de "volumen": 0 en el borde de la silueta, 1 en el interior profundo */
function volumeField(alpha: Uint8ClampedArray, w: number, h: number) {
  let field = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) field[i] = alpha[i * 4 + 3] > 127 ? 1 : 0;
  const inside = field.slice();
  // Varias pasadas de blur de caja: aproximan la distancia al borde
  for (let pass = 0; pass < 6; pass++) {
    const out = new Float32Array(w * h);
    const r = 3;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let s = 0;
        let n = 0;
        for (let dy = -r; dy <= r; dy += 1) {
          const yy = y + dy;
          if (yy < 0 || yy >= h) {
            n += 2 * r + 1;
            continue;
          }
          for (let dx = -r; dx <= r; dx += 1) {
            const xx = x + dx;
            if (xx >= 0 && xx < w) s += field[yy * w + xx];
            n++;
          }
        }
        out[y * w + x] = (s / n) * inside[y * w + x];
      }
    }
    field = out;
  }
  return field;
}

function inflatedGeometry(art: HTMLCanvasElement, aspect: number, back: boolean): BufferGeometry {
  const W = SIZE * aspect;
  const H = SIZE;
  const segX = 90;
  const segY = Math.round(segX / aspect);
  const geo = new PlaneGeometry(W, H, segX, segY);

  // Silueta a baja resolución para calcular el volumen
  const gw = 160;
  const gh = Math.round(gw / aspect);
  const c = document.createElement('canvas');
  c.width = gw;
  c.height = gh;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(art, 0, 0, gw, gh);
  const field = volumeField(ctx.getImageData(0, 0, gw, gh).data, gw, gh);
  const depth = 0.34;

  const pos = geo.attributes.position as BufferAttribute;
  const uv = geo.attributes.uv as BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const u = uv.getX(i);
    const v = uv.getY(i);
    // Muestreo bilineal del campo: bordes suaves, sin escalones
    const fx = Math.min(gw - 1.001, Math.max(0, u * (gw - 1)));
    const fy = Math.min(gh - 1.001, Math.max(0, (1 - v) * (gh - 1)));
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = fx - x0;
    const ty = fy - y0;
    const at = (x: number, y: number) => field[y * gw + x];
    const f = (at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx) * (1 - ty) + (at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx) * ty;
    const z = Math.sqrt(f) * depth;
    pos.setZ(i, back ? -z : z);
    // De espaldas la ilustración se lee espejada en X
    if (back) uv.setX(i, 1 - u);
  }
  if (back) {
    const idx = geo.index!;
    for (let i = 0; i < idx.count; i += 3) {
      const a = idx.getX(i + 1);
      idx.setX(i + 1, idx.getX(i + 2));
      idx.setX(i + 2, a);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

/** Material de tela para el volumen inflado desde la ilustración */
function clothMaterial(map: CanvasTexture, uniforms: Record<string, IUniform>) {
  return applyCloth(new MeshStandardMaterial({ map, roughness: 0.83, metalness: 0, alphaTest: 0.5, side: DoubleSide }), uniforms);
}

/** Inyecta el shader de tela en un MeshStandardMaterial */
function applyCloth<M extends MeshStandardMaterial>(m: M, uniforms: Record<string, IUniform>): M {
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        uniform float customRotation;
        uniform float intro;
        const float size = ${SIZE.toFixed(1)};
        mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0., -s, 0., 1., 0., s, 0., c); }
        mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1., 0., 0., 0., c, s, 0., -s, c); }
        float clothForce(float y) {
          return (1. - clamp((y + size / 2.5) / (size / 2.), 0., 1.))
            + 2. * (1. - clamp((y + size - 1.) / (size / 2.), 0., 1.))
            + .1;
        }`,
      )
      .replace(
        '#include <beginnormal_vertex>',
        /* glsl */ `#include <beginnormal_vertex>
        {
          float fN = clothForce(position.y);
          objectNormal = rotX(-intro * fN * PI * .2) * (rotY(customRotation * fN) * objectNormal);
        }`,
      )
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
        {
          float force = clothForce(position.y);
          // 1) torsión alrededor de Y
          transformed = rotY(customRotation * force) * transformed;
          // 2) la tela se abre radialmente con la velocidad del giro
          vec2 radial = transformed.xz;
          float len = length(radial);
          if (len > 1e-4) transformed.xz += radial / len * force * abs(customRotation) * .3;
          // 3) curva hacia adelante durante la entrada
          transformed = rotX(-intro * force * PI * .2) * transformed;
        }`,
      );
  };
  return m;
}

/** Copia la geometría con atributos en float: los modelos comprimidos vienen cuantizados */
function dequantize(src: BufferGeometry): BufferGeometry {
  const geo = src.clone();
  for (const name of Object.keys(geo.attributes)) {
    const a = geo.getAttribute(name) as BufferAttribute;
    if (a.array instanceof Float32Array && !a.normalized) continue;
    const out = new Float32Array(a.count * a.itemSize);
    for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) out[i * a.itemSize + k] = a.getComponent(i, k);
    geo.setAttribute(name, new BufferAttribute(out, a.itemSize));
  }
  return geo;
}

function texture(canvas: HTMLCanvasElement, maxAnisotropy: number) {
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = Math.min(8, maxAnisotropy);
  return t;
}

export class GarmentStudioScene {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(30, 1, 0.1, 100);
  private garment = new Group();
  private front: Mesh | null = null;
  private back: Mesh | null = null;
  private cloth: MeshStandardMaterial[] = [];
  private decal: Mesh | null = null;
  private uniforms = { customRotation: { value: 0 }, intro: { value: 1 } };
  private opts: GarmentStudioOptions;
  private raf = 0;
  private running = false;
  private last = 0;
  private introT = 0;
  private introStart = 0;
  private ro: ResizeObserver;

  /** Estado de interacción, con las constantes del controlador de referencia */
  private target = 0;
  private rotation = 0;
  private displacement = 0;
  private zoom = 0;

  constructor(opts: GarmentStudioOptions) {
    this.opts = opts;
    const r = new WebGLRenderer({ canvas: opts.canvas, alpha: true, antialias: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio, PIXEL_RATIO_CAP));
    r.outputColorSpace = SRGBColorSpace;
    r.toneMapping = ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.setClearColor(0x000000, 0);
    this.renderer = r;

    // Luz de estudio suave (iluminación por imagen, sin descargar mapas)
    const pmrem = new PMREMGenerator(r);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 1.1;
    pmrem.dispose();

    const src = opts.source;
    if (src.type === 'inflated') {
      const aniso = r.capabilities.getMaxAnisotropy();
      this.front = new Mesh(inflatedGeometry(src.artwork.front, src.aspect, false), clothMaterial(texture(src.artwork.front, aniso), this.uniforms));
      this.back = new Mesh(inflatedGeometry(src.artwork.back, src.aspect, true), clothMaterial(texture(src.artwork.back, aniso), this.uniforms));
      this.garment.add(this.front, this.back);
    }
    this.scene.add(this.garment);

    if (opts.reducedMotion) this.uniforms.intro.value = 0;

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(opts.canvas);
    this.resize();
  }

  /** Carga el modelo glTF (si la fuente es un modelo). Con la fuente inflada no hace nada. */
  async load() {
    const src = this.opts.source;
    if (src.type !== 'model') return;
    const [{ GLTFLoader }, { MeshoptDecoder }, { DecalGeometry }] = await Promise.all([
      import('three/examples/jsm/loaders/GLTFLoader.js'),
      import('three/examples/jsm/libs/meshopt_decoder.module.js'),
      import('three/examples/jsm/geometries/DecalGeometry.js'),
    ]);
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync(src.model.url);
    const root = gltf.scene;
    root.rotation.y = src.model.yaw;

    // Normaliza: alto = SIZE y centro en el origen, para que el shader de tela use la misma escala
    let box = new Box3().setFromObject(root);
    const size = box.getSize(new Vector3());
    root.scale.multiplyScalar(SIZE / size.y);
    root.updateMatrixWorld(true);
    box = new Box3().setFromObject(root);
    const center = box.getCenter(new Vector3());

    // Hornea las transformaciones en la geometría: el shader deforma en el espacio de la prenda
    const meshes: Mesh[] = [];
    root.traverse((o) => (o as Mesh).isMesh && meshes.push(o as Mesh));
    let body: Mesh | null = null;
    for (const mesh of meshes) {
      const geo = dequantize(mesh.geometry);
      geo.applyMatrix4(mesh.matrixWorld);
      geo.translate(-center.x, -center.y, -center.z);
      const orig = mesh.material as MeshStandardMaterial;
      const isFabric = geo.attributes.position.count > 1000;
      const mat = applyCloth(
        new MeshStandardMaterial({
          map: orig.map ?? null,
          normalMap: orig.normalMap ?? null,
          aoMap: orig.aoMap ?? null,
          color: isFabric ? src.color : '#e9e6e0',
          roughness: isFabric ? 0.83 : 0.6,
          metalness: 0,
          side: DoubleSide,
        }),
        this.uniforms,
      );
      if (isFabric) this.cloth.push(mat);
      const m = new Mesh(geo, mat);
      this.garment.add(m);
      if (!body || geo.attributes.position.count > body.geometry.attributes.position.count) body = m;
    }

    // Estampado: calco proyectado sobre el pecho
    if (body) {
      this.garment.updateMatrixWorld(true);
      const width = box.max.x - box.min.x;
      const y = box.min.y - center.y + SIZE * src.model.printHeight;
      const ray = new Raycaster(new Vector3(0, y, 50), new Vector3(0, 0, -1));
      const hit = ray.intersectObject(body, false)[0];
      if (hit) {
        const w = width * src.model.printWidth;
        const h = (w * src.print.height) / src.print.width;
        const geo = new DecalGeometry(body, hit.point, new Euler(0, 0, 0), new Vector3(w, h, 2));
        const mat = applyCloth(
          new MeshStandardMaterial({
            map: texture(src.print, this.renderer.capabilities.getMaxAnisotropy()),
            transparent: true,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -4,
            roughness: 0.83,
            metalness: 0,
          }),
          this.uniforms,
        );
        this.decal = new Mesh(geo, mat);
        this.garment.add(this.decal);
      }
    }

    // Al final, después del calco (que se calcula a escala 1). Prendas anchas (mangas abiertas): se achican en pantalla sin cambiar la escala del shader
    const fit = Math.max(1, (box.max.x - box.min.x) / (SIZE * 0.95));
    this.garment.scale.setScalar(1 / fit);

    this.renderOnce();
  }

  /** Cambia la ilustración (otro color) sin rehacer la escena */
  setArtwork(art: GarmentArtwork) {
    for (const [mesh, canvas] of [
      [this.front, art.front],
      [this.back, art.back],
    ] as const) {
      if (!mesh) continue;
      const m = mesh.material as MeshStandardMaterial;
      m.map?.dispose();
      m.map = texture(canvas, this.renderer.capabilities.getMaxAnisotropy());
      m.needsUpdate = true;
    }
    this.renderOnce();
  }

  /** Modelo real: nuevo color de tela y estampado con su tinta */
  setColor(color: string, print: HTMLCanvasElement) {
    for (const m of this.cloth) m.color.set(color);
    if (this.decal) {
      const m = this.decal.material as MeshStandardMaterial;
      m.map?.dispose();
      m.map = texture(print, this.renderer.capabilities.getMaxAnisotropy());
      m.needsUpdate = true;
    }
    this.renderOnce();
  }

  /** Arrastre horizontal en píxeles */
  drag(dx: number) {
    this.target += dx * 0.009;
    if (!this.opts.reducedMotion) this.displacement += dx * 0.0018;
    this.kick();
  }

  wheel(deltaY: number) {
    const before = this.zoom;
    this.zoom = MathUtils.clamp(this.zoom - deltaY * 0.002, ZOOM_MIN, ZOOM_MAX);
    this.kick();
    return this.zoom !== before;
  }

  pinch(distanceDelta: number) {
    this.zoom = MathUtils.clamp(this.zoom + distanceDelta * 0.012, ZOOM_MIN, ZOOM_MAX);
    this.kick();
  }

  /** Lleva la prenda al lado pedido por el camino más corto */
  face(side: 'front' | 'back') {
    const base = side === 'front' ? 0 : Math.PI;
    const turns = Math.round((this.target - base) / (Math.PI * 2));
    this.target = base + turns * Math.PI * 2;
    this.kick();
  }

  rotateBy(radians: number) {
    this.target += radians;
    if (!this.opts.reducedMotion) this.displacement += radians * 0.2;
    this.kick();
  }

  /** Lado visible según la rotación objetivo */
  get side(): 'front' | 'back' {
    const a = ((this.target % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    return a > Math.PI / 2 && a < (Math.PI * 3) / 2 ? 'back' : 'front';
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      const dt = Math.min((now - this.last) / 1000, 0.05);
      this.last = now;
      const settled = this.step(dt);
      this.renderer.render(this.scene, this.camera);
      // Con todo en reposo deja de dibujar: no consume GPU mientras nadie interactúa
      if (settled) {
        this.running = false;
        return;
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private kick() {
    if (this.opts.reducedMotion) {
      this.rotation = this.target;
      this.renderOnce();
      return;
    }
    this.start();
  }

  private step(dt: number) {
    const k = 1 - Math.exp(-dt * 7);
    this.rotation += (this.target - this.rotation) * (this.opts.reducedMotion ? 1 : k);
    this.displacement += (0 - this.displacement) * (1 - Math.exp(-dt * 4.5));
    if (!this.opts.reducedMotion && this.introT < 1 && dt > 0) {
      // Por reloj real: dura lo mismo aunque el equipo dibuje pocos cuadros
      this.introStart ||= performance.now();
      this.introT = Math.min(1, (performance.now() - this.introStart) / 1200);
      this.uniforms.intro.value = Math.pow(1 - this.introT, 3);
    }
    this.uniforms.customRotation.value = this.displacement;
    this.garment.rotation.y = this.rotation;
    this.camera.position.set(0, 0, 11 - this.zoom * 2);
    this.camera.lookAt(0, 0, 0);
    return Math.abs(this.target - this.rotation) < 1e-4 && Math.abs(this.displacement) < 1e-4 && (this.introT >= 1 || this.opts.reducedMotion);
  }

  renderOnce() {
    this.step(0);
    this.renderer.render(this.scene, this.camera);
  }

  private resize() {
    const { clientWidth: w, clientHeight: h } = this.opts.canvas;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderOnce();
  }

  dispose() {
    this.stop();
    this.ro.disconnect();
    this.garment.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      const m = mesh.material as MeshStandardMaterial;
      m.map?.dispose();
      m.normalMap?.dispose();
      m.aoMap?.dispose();
      m.dispose();
    });
    this.scene.environment?.dispose();
    this.renderer.dispose();
  }
}
