import {
  ACESFilmicToneMapping,
  Box3,
  CanvasTexture,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  Sprite,
  SpriteMaterial,
  Vector3,
  WebGLRenderer,
  type Object3D,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

/**
 * Escena del hero: el A319 con librea BILAIR sobre un mar de nubes al atardecer.
 * El cielo es CSS (detrás del canvas) para poder intercalar el logotipo entre el cielo y el avión.
 */

export interface PlaneSceneOptions {
  canvas: HTMLCanvasElement;
  modelUrl: string;
  lowPower: boolean;
  reducedMotion: boolean;
  onProgress?: (ratio: number) => void;
}

interface Cloud {
  sprite: Sprite;
  speed: number;
  baseScale: number;
}

function cloudTexture() {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  // Varios círculos suaves superpuestos: un cúmulo creíble sin cargar imágenes
  for (let i = 0; i < 22; i++) {
    const x = size * (0.22 + Math.random() * 0.56);
    const y = size * (0.42 + Math.random() * 0.22);
    const r = size * (0.1 + Math.random() * 0.16);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.18)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

export class PlaneScene {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(32, 1, 0.1, 400);
  private rig = new Group();
  private plane: Object3D | null = null;
  private clouds: Cloud[] = [];
  private raf = 0;
  private running = false;
  private last = 0;
  private time = 0;
  private scroll = 0;
  private scrollTarget = 0;
  private pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  private boost = 0;
  private boostTarget = 0;
  private opts: PlaneSceneOptions;
  private ro: ResizeObserver;

  constructor(opts: PlaneSceneOptions) {
    this.opts = opts;
    this.renderer = new WebGLRenderer({ canvas: opts.canvas, alpha: true, antialias: !opts.lowPower, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, opts.lowPower ? 1.25 : 1.75));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setClearColor(0x000000, 0);

    // Reflejos suaves de estudio para que el fuselaje no se vea plano
    const pmrem = new PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.55;
    pmrem.dispose();

    this.camera.position.set(0, 1.2, 15);
    this.scene.add(this.rig);

    // Luz de atardecer: cálida desde atrás a la derecha, cielo frío arriba, rebote de nubes abajo
    const hemi = new HemisphereLight(new Color('#c9d2e0'), new Color('#e6b38a'), 1.1);
    const sun = new DirectionalLight(new Color('#ffd2a6'), 2.6);
    sun.position.set(-6, 4, -3);
    const fill = new DirectionalLight(new Color('#f3efe8'), 1.1);
    fill.position.set(4, 2, 8);
    const rim = new DirectionalLight(new Color('#ff9a5c'), 0.9);
    rim.position.set(8, -1, -6);
    this.scene.add(hemi, sun, fill, rim);

    this.buildClouds();

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(opts.canvas);
    this.resize();
  }

  async load() {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync(this.opts.modelUrl, (e) => {
      if (e.total) this.opts.onProgress?.(e.loaded / e.total);
    });
    const model = gltf.scene;

    // Normaliza tamaño y centro: el avión mide ~10 unidades de punta a cola
    const box = new Box3().setFromObject(model);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const scale = 10 / Math.max(size.x, size.y, size.z);
    model.position.sub(center.multiplyScalar(scale));
    model.scale.setScalar(scale);

    model.traverse((o) => {
      const m = (o as Mesh).material as MeshStandardMaterial | undefined;
      if (m && 'metalness' in m) {
        // Pintura de fuselaje: algo de brillo para que el atardecer marque el volumen
        m.metalness = 0.08;
        m.roughness = Math.min(m.roughness ?? 1, 0.5);
      }
    });

    const holder = new Group();
    holder.add(model);
    this.plane = holder;
    this.rig.add(holder);
    this.opts.onProgress?.(1);
    this.renderOnce();
  }

  private buildClouds() {
    const tex = cloudTexture();
    const count = this.opts.lowPower ? 22 : 46;
    for (let i = 0; i < count; i++) {
      const mat = new SpriteMaterial({
        map: tex,
        color: new Color().setHSL(0.07, 0.45, 0.82 + Math.random() * 0.12),
        transparent: true,
        depthWrite: false,
        opacity: 0.85,
      });
      const s = new Sprite(mat);
      const baseScale = 9 + Math.random() * 14;
      s.scale.set(baseScale * 1.8, baseScale, 1);
      s.position.set(MathUtils.randFloatSpread(90), -7 - Math.random() * 6, -Math.random() * 120 + 20);
      this.scene.add(s);
      this.clouds.push({ sprite: s, speed: 3 + Math.random() * 3, baseScale });
    }
  }

  setScroll(progress: number) {
    this.scrollTarget = MathUtils.clamp(progress, 0, 1);
    if (this.opts.reducedMotion) {
      this.scroll = this.scrollTarget;
      this.renderOnce();
    }
  }

  setPointer(x: number, y: number) {
    this.pointer.tx = x;
    this.pointer.ty = y;
  }

  /** Despegue rápido al pulsar "Explorar destinos" */
  takeoff() {
    this.boostTarget = 1;
    window.setTimeout(() => (this.boostTarget = 0), 1400);
  }

  start() {
    if (this.running || this.opts.reducedMotion) {
      this.renderOnce();
      return;
    }
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      const dt = Math.min((now - this.last) / 1000, 0.05);
      this.last = now;
      this.update(dt);
      this.renderer.render(this.scene, this.camera);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private renderOnce() {
    this.update(0);
    this.renderer.render(this.scene, this.camera);
  }

  private update(dt: number) {
    this.time += dt;
    const k = 1 - Math.exp(-dt * 4);
    this.scroll += (this.scrollTarget - this.scroll) * (dt ? k : 1);
    this.boost += (this.boostTarget - this.boost) * (dt ? 1 - Math.exp(-dt * 3) : 1);
    this.pointer.x += (this.pointer.tx - this.pointer.x) * (dt ? k : 1);
    this.pointer.y += (this.pointer.ty - this.pointer.y) * (dt ? k : 1);

    const p = this.scroll;
    const e = p * p * (3 - 2 * p); // smoothstep
    const t = this.time;
    const narrow = this.camera.aspect < 0.9;

    if (this.plane) {
      // Pose inicial: tres cuartos de frente, ligero alabeo.
      // Con el scroll el avión acelera, asciende y pasa por encima de la cámara: empieza el recorrido.
      const bob = Math.sin(t * 0.9) * 0.12;
      const fly = e + this.boost * 0.9;
      this.plane.position.set((narrow ? 0.3 : 2.6) - fly * (narrow ? 5 : 11), (narrow ? -0.6 : 0.1) + bob + fly * 4.2, fly * 7);
      this.plane.rotation.set(-0.08 + Math.sin(t * 0.7) * 0.015, -2.35 - fly * 0.2, 0.12 + Math.sin(t * 0.5) * 0.03 + fly * 0.25);
      const s = narrow ? 0.5 : 0.7;
      this.plane.scale.setScalar(s);
    }

    // Las nubes avanzan hacia la cámara: sensación de vuelo
    const speedMul = 1 + e * 2 + this.boost * 8;
    for (const c of this.clouds) {
      c.sprite.position.z += c.speed * speedMul * dt;
      if (c.sprite.position.z > 18) {
        c.sprite.position.z = -100 - Math.random() * 20;
        c.sprite.position.x = MathUtils.randFloatSpread(90);
      }
      const fade = MathUtils.smoothstep(c.sprite.position.z, -100, -70) * (1 - MathUtils.smoothstep(c.sprite.position.z, 6, 16));
      (c.sprite.material as SpriteMaterial).opacity = 0.85 * fade;
    }

    this.camera.position.x = this.pointer.x * 0.6;
    this.camera.position.y = 1.2 + this.pointer.y * 0.35 - e * 0.8;
    this.camera.lookAt(0, -0.2 + e * 1.2, 0);
  }

  private resize() {
    const { clientWidth: w, clientHeight: h } = this.opts.canvas;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 0.9 ? 44 : 32;
    this.camera.updateProjectionMatrix();
    if (!this.running) this.renderOnce();
  }

  dispose() {
    this.stop();
    this.ro.disconnect();
    this.scene.traverse((o) => {
      const mesh = o as Mesh;
      mesh.geometry?.dispose?.();
      const m = mesh.material as MeshStandardMaterial | MeshStandardMaterial[] | undefined;
      (Array.isArray(m) ? m : m ? [m] : []).forEach((mat) => {
        mat.map?.dispose();
        mat.dispose();
      });
    });
    this.renderer.dispose();
  }
}
