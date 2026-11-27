import {
  ACESFilmicToneMapping,
  Box3,
  CanvasTexture,
  DirectionalLight,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
  type MeshStandardMaterial,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildGarment, loadGarmentGltf, SIZE, type GarmentModel } from './GarmentStudioScene';
import { CUTS, phaseAt, type SpotPhase } from './hoodieCodeTimeline';

/**
 * "Hoodie Code": comercial de 10 segundos en tiempo real.
 * Un buzo negro flota; un swipe lo saca de cuadro y entra el buzo del color destacado con un rebote.
 * Siguen contrapicado, giro con rampa de velocidad, perfil con paneo rápido, tres paneles frente/lado/espalda,
 * primerísimos planos del estampado y la capucha, y un plano final de héroe con acercamiento lento.
 */

export interface HoodieCodeOptions {
  canvas: HTMLCanvasElement;
  model: GarmentModel;
  from: { color: string; print: HTMLCanvasElement };
  to: { color: string; print: HTMLCanvasElement };
  reducedMotion: boolean;
  onPhase: (phase: SpotPhase) => void;
  onTick: (t: number) => void;
}

const PIXEL_RATIO_CAP = 1.5;
const FOV = 30;
const TAN = Math.tan(MathUtils.degToRad(FOV / 2));
/** Tiempo de espera antes del swipe automático si nadie toca la prenda */
const AUTO_SWIPE = 2.6;

const clamp01 = (x: number) => MathUtils.clamp(x, 0, 1);
const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const easeInCubic = (x: number) => x * x * x;
const easeOutCubic = (x: number) => 1 - (1 - x) ** 3;
const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const easeOutExpo = (x: number) => (x >= 1 ? 1 : 1 - 2 ** (-10 * x));
/** Rampa de velocidad: arranca lento, acelera fuerte y frena en seco */
const speedRamp = (x: number) => (x < 0.5 ? 16 * x ** 5 : 1 - (-2 * x + 2) ** 5 / 2);

interface Garment {
  group: Group;
  uniforms: { customRotation: { value: number }; intro: { value: number } };
  shadow: Mesh;
}

interface Pose {
  x: number;
  y: number;
  rotY: number;
  rotZ: number;
  twist: number;
  visible: boolean;
}

function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(22,21,19,0.55)');
  g.addColorStop(0.55, 'rgba(22,21,19,0.18)');
  g.addColorStop(1, 'rgba(22,21,19,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export class HoodieCodeScene {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(FOV, 1, 0.05, 100);
  private opts: HoodieCodeOptions;
  private a: Garment | null = null;
  private b: Garment | null = null;
  private shadowTex = shadowTexture();
  private ro: ResizeObserver;
  private raf = 0;
  private running = false;
  private visible = false;
  private last = 0;
  private width = 1;
  private height = 1;

  /** Estado del comercial */
  private state: 'idle' | 'playing' | 'done' = 'idle';
  private t = 0;
  private idleT = 0;
  private autoSwipeAt = AUTO_SWIPE;
  private phase: SpotPhase | null = null;

  /** Arrastre del buzo negro (unidades de escena) */
  private dragging = false;
  private dragX = 0;
  private dragVel = 0;
  private swipeFrom = 0;

  private look = new Vector3();

  /** Medidas reales de la prenda en escena (se calculan al cargar) */
  private hh = SIZE / 2;
  private hw = SIZE / 2;
  private hd = SIZE / 4;
  private floor = -SIZE / 2;
  private top = SIZE / 2;
  private printY = 0.5;

  constructor(opts: HoodieCodeOptions) {
    this.opts = opts;
    const r = new WebGLRenderer({ canvas: opts.canvas, alpha: true, antialias: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio, PIXEL_RATIO_CAP));
    r.outputColorSpace = SRGBColorSpace;
    r.toneMapping = ACESFilmicToneMapping;
    r.toneMappingExposure = 1;
    r.setClearColor(0x000000, 0);
    r.autoClear = false;
    this.renderer = r;

    // Estudio: luz ambiente de imagen + una luz principal que marca pliegues y costuras
    const pmrem = new PMREMGenerator(r);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.6;
    pmrem.dispose();
    const key = new DirectionalLight(0xffffff, 1.15);
    key.position.set(-4, 6, 7);
    const rim = new DirectionalLight(0xffffff, 0.7);
    rim.position.set(5, 3, -6);
    this.scene.add(key, rim);

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(opts.canvas);
    this.resize();
  }

  async load() {
    const { model, from, to } = this.opts;
    const gltf = await loadGarmentGltf(model.url);
    const aniso = this.renderer.capabilities.getMaxAnisotropy();
    const make = async (color: string, print: HTMLCanvasElement): Promise<Garment> => {
      const uniforms = { customRotation: { value: 0 }, intro: { value: 0 } };
      const built = await buildGarment(gltf, model, color, print, uniforms, aniso);
      const group = new Group();
      group.add(built.group);
      const shadow = new Mesh(
        new PlaneGeometry(SIZE * 1.15, SIZE * 0.42),
        new MeshBasicMaterial({ map: this.shadowTex, transparent: true, depthWrite: false, toneMapped: false }),
      );
      shadow.rotation.x = -Math.PI / 2;
      this.scene.add(group, shadow);
      return { group, uniforms, shadow };
    };
    this.a = await make(from.color, from.print);
    this.b = await make(to.color, to.print);
    const box = new Box3().setFromObject(this.b.group);
    this.hh = (box.max.y - box.min.y) / 2;
    this.hw = (box.max.x - box.min.x) / 2;
    this.hd = (box.max.z - box.min.z) / 2;
    this.floor = box.min.y;
    this.top = box.max.y;
    this.printY = SIZE * (model.printHeight - 0.5) * this.b.group.children[0].scale.y;
    if (this.opts.reducedMotion) this.finish();
    this.render();
  }

  /** Solo avanza (y dibuja) mientras está en pantalla */
  setVisible(v: boolean) {
    this.visible = v;
    if (v) this.start();
    else this.stop();
  }

  /** El swipe que saca al buzo negro y arranca el comercial */
  swipe() {
    if (this.state !== 'idle' || !this.a) return;
    this.state = 'playing';
    this.t = 0;
    this.swipeFrom = this.dragX;
    this.dragging = false;
    this.start();
  }

  replay() {
    if (this.opts.reducedMotion) return;
    this.state = 'idle';
    this.t = 0;
    this.idleT = 0;
    this.autoSwipeAt = 1.1;
    this.dragX = 0;
    this.start();
  }

  dragStart() {
    if (this.state === 'idle') this.dragging = true;
  }

  /** Arrastre horizontal en píxeles; devuelve true si lo tomó */
  dragMove(dxPx: number) {
    if (!this.dragging || this.state !== 'idle') return false;
    const worldPerPx = (2 * this.distance(this.width / this.height) * TAN * (this.width / this.height)) / this.width;
    const dx = dxPx * worldPerPx;
    this.dragX = Math.min(this.dragX + dx, 0.6);
    this.dragVel = dx;
    this.idleT = 0;
    this.start();
    return true;
  }

  /** Al soltar: si lo tiró a la izquierda con decisión, swipe; si no, vuelve a su lugar */
  dragEnd(velocityPxPerMs: number) {
    if (!this.dragging) return;
    this.dragging = false;
    if (this.dragX < -1.1 || velocityPxPerMs < -0.45) this.swipe();
    else this.start();
  }

  /** Cuadro fijo en un instante del comercial (para revisar la coreografía con ?hc-frame=<segundos>) */
  freeze(t: number) {
    this.stop();
    this.visible = false;
    this.state = t >= CUTS.end ? 'done' : 'playing';
    this.t = t;
    this.emit(t);
    this.render();
  }

  get playing() {
    return this.state === 'playing';
  }

  private finish() {
    this.state = 'done';
    this.t = CUTS.end;
    this.emit(CUTS.end);
  }

  private start() {
    if (this.running || !this.visible || !this.a) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      const dt = Math.min((now - this.last) / 1000, 0.1);
      this.last = now;
      this.advance(dt);
      this.render();
      if (this.state === 'done') {
        this.running = false;
        return;
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  private stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private advance(dt: number) {
    if (this.state === 'idle') {
      this.idleT += dt;
      if (!this.dragging) {
        // Resorte de vuelta al centro
        const k = 1 - Math.exp(-dt * 9);
        this.dragVel = (0 - this.dragX) * k;
        this.dragX += this.dragVel;
        if (this.idleT > this.autoSwipeAt && !this.opts.reducedMotion) this.swipe();
      }
    } else if (this.state === 'playing') {
      this.t += dt;
      if (this.t >= CUTS.end) this.finish();
    }
    if (this.state !== 'idle') this.emit(this.t);
    else this.emitPhase('idle');
  }

  private emit(t: number) {
    this.opts.onTick(t);
    this.emitPhase(phaseAt(t));
  }

  private emitPhase(p: SpotPhase) {
    if (p === this.phase) return;
    this.phase = p;
    this.opts.onPhase(p);
  }

  /** Distancia de cámara para que la prenda entre completa con un aspecto dado */
  private distance(aspect: number) {
    // Se suma la profundidad: a esta distancia la perspectiva agranda bastante el frente de la prenda
    return Math.max((this.hh * 1.25) / TAN, (this.hw * 1.15) / (TAN * aspect)) + this.hd;
  }

  private halfWidthAt(d: number) {
    return d * TAN * (this.width / this.height);
  }

  // ───────── Coreografía ─────────

  private poseA(): Pose {
    const idle = this.idleT;
    if (this.state === 'idle') {
      return {
        x: this.dragX,
        y: 0.1 * Math.sin(idle * 1.5),
        rotY: 0.2 * Math.sin(idle * 0.6) + this.dragX * 0.12,
        rotZ: -this.dragX * 0.05,
        twist: MathUtils.clamp(-this.dragVel * 6, -0.8, 0.8),
        visible: true,
      };
    }
    const p = span(this.t, 0, CUTS.swipeOut);
    const out = -(this.halfWidthAt(this.distance(this.width / this.height)) + SIZE);
    const e = easeInCubic(p);
    return {
      x: MathUtils.lerp(this.swipeFrom, out, e),
      y: 0.4 * e,
      rotY: -1.1 * e,
      rotZ: 0.4 * e,
      twist: -1.4 * Math.sin(Math.PI * p),
      visible: p < 1,
    };
  }

  private poseB(): Pose {
    const t = this.t;
    const hidden: Pose = { x: 0, y: 0, rotY: 0, rotZ: 0, twist: 0, visible: false };
    if (this.state === 'idle' || t < CUTS.inStart) return hidden;
    const d = this.distance(this.width / this.height);
    const tau = t - CUTS.inStart;
    // Resorte amortiguado desde la derecha
    const x0 = this.halfWidthAt(d) + SIZE;
    const spring = (s: number) => x0 * Math.exp(-6.5 * s) * Math.cos(10 * s);
    const x = spring(tau);
    const vel = (spring(tau + 0.01) - x) / 0.01;
    const pose: Pose = {
      x,
      y: 0.06 * Math.sin(t * 1.6),
      rotY: 0.7 * Math.exp(-5 * tau),
      rotZ: -0.3 * Math.exp(-5 * tau) * Math.cos(8 * tau),
      twist: MathUtils.clamp(vel * 0.03, -1, 1),
      visible: true,
    };

    if (t >= CUTS.street && t < CUTS.iconic) {
      // Giro completo con rampa de velocidad: la tela se abre con la velocidad
      const p = span(t, CUTS.street, CUTS.iconic);
      const a = speedRamp(p);
      const w = (speedRamp(Math.min(1, p + 0.01)) - a) / 0.01;
      pose.rotY = 0.35 + Math.PI * 2 * a;
      pose.twist = MathUtils.clamp(w * 0.09, 0, 0.95);
    } else if (t >= CUTS.oversized && t < CUTS.street) {
      pose.rotY = 0.35 * easeInOutCubic(span(t, CUTS.oversized, CUTS.street));
    } else if (t >= CUTS.iconic && t < CUTS.split) {
      pose.rotY = -0.62 + 0.12 * span(t, CUTS.iconic, CUTS.split);
      pose.rotZ = 0.03;
    } else if (t >= CUTS.macro && t < CUTS.whip) {
      pose.y = 0;
      pose.rotY = t < CUTS.detail ? 0 : -0.35;
    } else if (t >= CUTS.whip && t < CUTS.hero) {
      const p = span(t, CUTS.whip, CUTS.hero);
      pose.rotY = -0.35 - (Math.PI * 2 - 0.35) * easeInOutCubic(p);
      pose.twist = -0.9 * Math.sin(Math.PI * p);
    } else if (t >= CUTS.hero) {
      pose.rotY = Math.PI * -2 + 0.08 * (1 - easeOutCubic(span(t, CUTS.hero, CUTS.hold)));
      pose.rotZ = 0.035 * easeOutCubic(span(t, CUTS.hero, CUTS.hold));
      pose.y = 0.04 * Math.sin(t * 1.6) * (1 - span(t, CUTS.hold - 0.4, CUTS.hold));
    }
    return pose;
  }

  /** Cámara para el cuadro completo (todo menos los tres paneles) */
  private shot(aspect: number) {
    const t = this.t;
    const d = this.distance(aspect);
    const cam = new Vector3(0, 0.15, d);
    const look = new Vector3(0, 0, 0);
    let roll = 0;
    if (this.state === 'idle' || t < CUTS.oversized) return { cam, look, roll };

    if (t < CUTS.street) {
      // Contrapicado agresivo con acercamiento
      const p = easeOutCubic(span(t, CUTS.oversized, CUTS.street));
      const h = this.hh;
      cam.set(h * (0.6 - 0.4 * p), -h * 1.35, d * (1.12 - 0.08 * p));
      look.set(0, h * 0.3, 0);
    } else if (t < CUTS.iconic) {
      const p = span(t, CUTS.street, CUTS.iconic);
      cam.set(0, 0.2, d * 1.08);
      roll = 0.06 * Math.sin(Math.PI * p);
    } else if (t < CUTS.split) {
      // Paneo rápido que frena en un perfil tres cuartos
      const p = easeOutExpo(span(t, CUTS.iconic, CUTS.iconic + 0.45));
      const drift = span(t, CUTS.iconic, CUTS.split);
      cam.set(MathUtils.lerp(d * 1.6, -d * 0.18, p) - 0.2 * drift, this.hh * 0.45, d * (1.05 - 0.05 * drift));
      look.set(MathUtils.lerp(d * 0.5, 0, p), 0.1, 0);
      roll = -0.03;
    } else if (t < CUTS.detail) {
      // Primerísimo primer plano del estampado
      const p = span(t, CUTS.macro, CUTS.detail);
      cam.set(-0.55 + 0.9 * p, this.printY + 0.05, 2.55 - 0.25 * p);
      look.set(0.05 * p, this.printY, 0);
    } else if (t < CUTS.whip) {
      // Detalle de capucha y costura del hombro
      const p = span(t, CUTS.detail, CUTS.whip);
      look.set(this.hw * 0.18, this.top - this.hh * 0.32, 0);
      cam.set(look.x + 1.5 - 0.3 * p, look.y + 0.45 + 0.1 * p, 2.3);
      roll = 0.04;
    } else if (t < CUTS.hero) {
      const p = easeInOutCubic(span(t, CUTS.whip, CUTS.hero));
      cam.set(0, MathUtils.lerp(this.hh, 0.1, p), MathUtils.lerp(d * 0.6, d * 1.5, p));
      look.set(0, MathUtils.lerp(this.hh * 0.6, 0, p), 0);
    } else {
      // Acercamiento final suave y cuadro fijo el último medio segundo
      const p = easeInOutCubic(span(t, CUTS.hero, CUTS.hold));
      cam.set(0, 0.1, d * MathUtils.lerp(1.5, 1.3, p));
    }
    return { cam, look, roll };
  }

  private apply(g: Garment, pose: Pose) {
    g.group.visible = pose.visible;
    g.shadow.visible = pose.visible;
    g.group.position.set(pose.x, pose.y, 0);
    g.group.rotation.set(0, pose.rotY, pose.rotZ);
    g.uniforms.customRotation.value = pose.twist;
    // Sombra de contacto: más chica y suave cuanto más alto flota
    g.shadow.position.set(pose.x, this.floor - 0.18, 0);
    const lift = MathUtils.clamp(pose.y, -0.3, 0.6);
    g.shadow.scale.setScalar(1 - lift * 0.3);
    (g.shadow.material as MeshBasicMaterial).opacity = 0.75 - lift * 0.5;
  }

  private setCamera(aspect: number, cam: Vector3, look: Vector3, roll: number) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.camera.position.copy(cam);
    this.camera.up.set(Math.sin(roll), Math.cos(roll), 0);
    this.look.copy(look);
    this.camera.lookAt(this.look);
  }

  private render() {
    if (!this.a || !this.b) return;
    const r = this.renderer;
    const W = this.width;
    const H = this.height;
    r.setScissorTest(false);
    r.setViewport(0, 0, W, H);
    r.clear();

    this.apply(this.a, this.poseA());
    const pb = this.poseB();
    this.apply(this.b, pb);

    const split = this.state !== 'idle' && this.t >= CUTS.split && this.t < CUTS.macro;
    if (!split) {
      const { cam, look, roll } = this.shot(W / H);
      this.setCamera(W / H, cam, look, roll);
      r.render(this.scene, this.camera);
      return;
    }

    // Tres paneles: frente, lado y espalda. En pantallas verticales van uno debajo del otro.
    this.a.group.visible = this.a.shadow.visible = false;
    const rows = W / H < 1;
    const angles = [0, Math.PI / 2, Math.PI];
    r.setScissorTest(true);
    for (let i = 0; i < 3; i++) {
      const reveal = easeOutCubic(span(this.t, CUTS.split + i * 0.14, CUTS.split + i * 0.14 + 0.32));
      if (reveal <= 0) continue;
      const pw = rows ? W : W / 3;
      const ph = rows ? H / 3 : H;
      const px = rows ? 0 : i * pw;
      const py = rows ? H - (i + 1) * ph : 0;
      // Cada panel se descubre de abajo hacia arriba
      r.setViewport(px, py, pw, ph);
      r.setScissor(px, py, pw, ph * reveal);
      const drift = 0.18 * span(this.t, CUTS.split, CUTS.macro);
      this.b.group.position.set(0, 0, 0);
      this.b.group.rotation.set(0, angles[i] + drift, 0);
      this.b.uniforms.customRotation.value = 0;
      this.b.shadow.position.x = 0;
      const aspect = pw / ph;
      const d = Math.max((this.hh * 1.3) / TAN, (this.hw * 1.04) / (TAN * aspect)) + this.hd;
      this.setCamera(aspect, new Vector3(0, 0.2, d), new Vector3(0, 0, 0), 0);
      r.render(this.scene, this.camera);
    }
    r.setScissorTest(false);
  }

  private resize() {
    const { clientWidth: w, clientHeight: h } = this.opts.canvas;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    // Tamaño real del búfer: el viewport y el scissor trabajan en píxeles CSS × pixel ratio internamente
    this.width = w;
    this.height = h;
    this.render();
  }

  dispose() {
    this.stop();
    this.ro.disconnect();
    for (const g of [this.a, this.b]) {
      if (!g) continue;
      g.group.traverse((o) => {
        const mesh = o as Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        const m = mesh.material as MeshStandardMaterial;
        if (m.map && m.map.image instanceof HTMLCanvasElement) m.map.dispose();
        m.dispose();
      });
      g.shadow.geometry.dispose();
      (g.shadow.material as MeshBasicMaterial).dispose();
    }
    this.shadowTex.dispose();
    this.scene.environment?.dispose();
    this.renderer.dispose();
  }
}
