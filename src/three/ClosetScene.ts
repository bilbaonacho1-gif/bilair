import {
  ACESFilmicToneMapping,
  Box3,
  CylinderGeometry,
  DirectionalLight,
  Group,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  ShadowMaterial,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Object3D,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { HangConfig } from '../data/garmentModels';
import { buildGarment, loadGarmentGltf, SIZE, type GarmentModel } from './GarmentStudioScene';
import { buildHanger } from './hanger';

/**
 * El ropero en 3D: las prendas cuelgan de costado en un barral, como en un ropero de verdad.
 * Se balancean con el aire, se mueven al pasarles la mano (el puntero) y la tela se atrasa y se tuerce.
 * Al tocar una, gira sobre su gancho y se abre de frente; las vecinas le hacen lugar.
 * Todo está en centímetros. El fondo (pared, estante) es CSS: el lienzo es transparente.
 */

export interface ClosetItem {
  key: string;
  model: GarmentModel;
  hang: HangConfig;
  color: string;
}

export interface ClosetOptions {
  canvas: HTMLCanvasElement;
  items: ClosetItem[];
  reducedMotion: boolean;
  /** Distancia en píxeles desde el borde superior del lienzo hasta el barral */
  railPx: number;
  /** Cambió la prenda abierta (null = ninguna) */
  onOpen: (key: string | null) => void;
  /** Tocaron la prenda que ya estaba abierta: ver su ficha */
  onSelect: (key: string) => void;
  /** Cada cuadro: dónde poner el cartel de la prenda abierta, en píxeles del lienzo */
  onAnchor: (x: number, y: number) => void;
}

const RAIL_R = 1.5;
const FOV = 24;
const TAN = Math.tan(MathUtils.degToRad(FOV / 2));
/** Alto visible del ropero en cm con el zoom normal */
const VIEW_H = 114;
const WALL_Z = -52;
const CLOSED_YAW = MathUtils.degToRad(76);
const PEEK_YAW = MathUtils.degToRad(54);
/** Lugar que ocupa en el barral una prenda colgada de costado */
const SLOT = 19;
const OPEN_Z = 16;

interface Hung {
  item: ClosetItem;
  pivot: Group;
  swing: Group;
  turn: Group;
  uniforms: { customRotation: { value: number }; intro: { value: number }; sway: { value: Vector2 }; wind: { value: Vector3 } };
  visible: boolean;
  /** Medidas en cm */
  width: number;
  bottom: number;
  x: number;
  tx: number;
  vx: number;
  z: number;
  yaw: number;
  yawVel: number;
  /** Péndulo: a = de lado, b = adelante/atrás */
  a: number;
  aVel: number;
  b: number;
  bVel: number;
  phase: number;
}

export class ClosetScene {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(FOV, 1, 10, 2000);
  private key = new DirectionalLight(0xffffff, 1.45);
  private opts: ClosetOptions;
  private hung: Hung[] = [];
  private ro: ResizeObserver;
  private raf = 0;
  private running = false;
  private visible = false;
  private last = 0;
  private time = 0;
  private w = 1;
  private h = 1;

  private openKey: string | null = null;
  private hoverKey: string | null = null;
  private camX = 0;
  private panX = 0;
  private zoom = 1;
  private rowHalf = 0;

  /** Puntero */
  private down: { x: number; y: number; id: number } | null = null;
  private dragging = false;
  private lastPointer = { x: 0, t: 0 };

  constructor(opts: ClosetOptions) {
    this.opts = opts;
    const r = new WebGLRenderer({ canvas: opts.canvas, alpha: true, antialias: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    r.outputColorSpace = SRGBColorSpace;
    r.toneMapping = ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.setClearColor(0x000000, 0);
    r.shadowMap.enabled = true;
    this.renderer = r;

    const pmrem = new PMREMGenerator(r);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.5;
    pmrem.dispose();

    // Foco de techo: marca los pliegues y proyecta las sombras sobre la pared
    const k = this.key;
    k.castShadow = true;
    k.shadow.mapSize.setScalar(window.innerWidth < 700 ? 1024 : 2048);
    Object.assign(k.shadow.camera, { left: -230, right: 230, top: 60, bottom: -170, near: 10, far: 1200 });
    k.shadow.bias = -0.006;
    k.shadow.normalBias = 2.6;
    k.shadow.radius = 5;
    this.scene.add(k, k.target);

    // Pared: solo recibe sombras (el microcemento es el fondo CSS)
    const wall = new Mesh(new PlaneGeometry(4000, 800), new ShadowMaterial({ opacity: 0.3 }));
    wall.position.set(0, -80, WALL_Z);
    wall.receiveShadow = true;
    this.scene.add(wall);

    // Barral de acero negro
    const rail = new Mesh(new CylinderGeometry(RAIL_R, RAIL_R, 4000, 20), new MeshStandardMaterial({ color: '#1b1b1d', roughness: 0.38, metalness: 0.9 }));
    rail.rotation.z = Math.PI / 2;
    rail.castShadow = true;
    this.scene.add(rail);

    const c = opts.canvas;
    c.addEventListener('pointerdown', this.onDown);
    c.addEventListener('pointermove', this.onMove);
    c.addEventListener('pointerleave', this.onLeave);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onUp);

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(c);
    this.resize();
  }

  async load() {
    const gltfs = new Map<string, Promise<{ scene: Object3D }>>();
    const aniso = this.renderer.capabilities.getMaxAnisotropy();
    for (const [i, item] of this.opts.items.entries()) {
      if (!gltfs.has(item.model.url)) gltfs.set(item.model.url, loadGarmentGltf(item.model.url));
      const gltf = await gltfs.get(item.model.url)!;
      const uniforms = { customRotation: { value: 0 }, intro: { value: 0 }, sway: { value: new Vector2() }, wind: { value: new Vector3(0, 0, i * 1.7) } };
      const built = await buildGarment(gltf, { ...item.model, hood: item.hang.hood }, item.color, undefined, uniforms, aniso);

      // A centímetros: el alto de la prenda (SIZE en sus unidades) pasa a ser su alto real
      const gs = built.group.scale.y;
      const cm = item.hang.heightCm / (SIZE * gs);
      const garment = new Group();
      garment.add(built.group);
      garment.scale.setScalar(cm);
      const hanger = buildHanger(item.hang.spanCm, item.hang.dropCm, item.hang.stemCm);
      // Origen de la percha (donde el gancho entra en la madera), medido desde el centro del barral
      const originY = -(hanger.top - 0.45 - RAIL_R);
      garment.position.set(0, originY - item.hang.neckY * gs * cm, -item.hang.z * gs * cm);
      hanger.body.position.y = originY;
      hanger.hook.position.y = originY;

      const turn = new Group();
      turn.add(garment, hanger.body);
      const swing = new Group();
      swing.add(turn, hanger.hook);
      const pivot = new Group();
      pivot.add(swing);
      pivot.traverse((o) => {
        const m = o as Mesh;
        if (m.isMesh) m.castShadow = m.receiveShadow = true;
      });
      this.scene.add(pivot);

      const box = new Box3().setFromObject(garment);
      this.hung.push({
        item,
        pivot,
        swing,
        turn,
        uniforms,
        visible: true,
        width: box.max.x - box.min.x,
        bottom: box.min.y,
        x: 0,
        tx: 0,
        vx: 0,
        z: 0,
        yaw: CLOSED_YAW,
        yawVel: 0,
        a: 0,
        aVel: 0,
        b: 0,
        bVel: 0,
        phase: i * 2.4,
      });
    }
    this.layout(true);
    this.render();
  }

  // ───────── API ─────────

  setVisible(v: boolean) {
    this.visible = v;
    if (v) this.start();
    else this.stop();
  }

  /** Muestra solo estas prendas (pestañas de categoría) */
  setFilter(keys: string[]) {
    const set = new Set(keys);
    for (const g of this.hung) {
      g.visible = set.has(g.item.key);
      g.pivot.visible = g.visible;
    }
    if (this.openKey && !set.has(this.openKey)) this.open(null);
    this.panX = 0;
    this.layout(false);
  }

  open(key: string | null) {
    if (key === this.openKey) return;
    this.openKey = key;
    const g = this.hung.find((x) => x.item.key === key);
    // Sale hacia adelante: un empujón al péndulo
    if (g && !this.opts.reducedMotion) g.bVel += 0.9;
    this.layout(false);
    this.opts.onOpen(key);
    this.start();
  }

  /** Deja una prenda entreabierta (foco de teclado) */
  peek(key: string | null) {
    this.hoverKey = key;
  }

  /** Corre el barral una pantalla hacia un lado */
  pan(dir: number) {
    this.open(null);
    this.panX = this.clampPan(this.panX + dir * this.viewW() * 0.5);
    this.nudge(-dir * 1.2);
  }

  // ───────── Disposición ─────────

  private shown() {
    return this.hung.filter((g) => g.visible);
  }

  private slotOf(g: Hung) {
    return g.item.key === this.openKey ? g.width + 22 : SLOT;
  }

  private layout(snap: boolean) {
    const list = this.shown();
    const total = list.reduce((n, g) => n + this.slotOf(g), 0);
    this.rowHalf = total / 2;
    let x = -total / 2;
    for (const g of list) {
      const slot = this.slotOf(g);
      g.tx = x + slot / 2;
      x += slot;
      if (snap) g.x = g.tx;
    }
    this.panX = this.clampPan(this.panX);
  }

  private viewH() {
    return VIEW_H * this.zoom;
  }

  private viewW() {
    return (this.viewH() * this.w) / this.h;
  }

  private clampPan(x: number) {
    const max = Math.max(0, this.rowHalf + 26 - (VIEW_H * this.w) / this.h / 2);
    return MathUtils.clamp(x, -max, max);
  }

  /** Empujón de lado a todas las prendas (al correr el barral) */
  private nudge(v: number) {
    if (this.opts.reducedMotion) return;
    for (const g of this.shown()) g.aVel += v * (0.7 + 0.3 * Math.sin(g.phase));
  }

  // ───────── Puntero ─────────

  /** Punto del plano del barral bajo el puntero, en cm */
  private world(e: PointerEvent) {
    const r = this.opts.canvas.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = 1 - ((e.clientY - r.top) / r.height) * 2;
    return { x: this.camera.position.x + (nx * this.viewW()) / 2, y: this.camera.position.y + (ny * this.viewH()) / 2 };
  }

  private hit(e: PointerEvent): Hung | null {
    const p = this.world(e);
    let best: Hung | null = null;
    let bestD = Infinity;
    for (const g of this.shown()) {
      if (p.y > 6 || p.y < g.bottom - 8) continue;
      // Colgada de costado se ve más ancha que su lugar en el barral: gana la más cercana al puntero
      const half = g.item.key === this.openKey ? g.width / 2 + 4 : 20;
      const d = Math.abs(p.x - g.x);
      if (d <= half && d < bestD) {
        best = g;
        bestD = d;
      }
    }
    return best;
  }

  private onDown = (e: PointerEvent) => {
    this.down = { x: e.clientX, y: e.clientY, id: e.pointerId };
    this.dragging = false;
    this.lastPointer = { x: e.clientX, t: e.timeStamp };
  };

  private onMove = (e: PointerEvent) => {
    const dxPx = e.clientX - this.lastPointer.x;
    const dt = Math.max(1, e.timeStamp - this.lastPointer.t);
    this.lastPointer = { x: e.clientX, t: e.timeStamp };
    const cmPerPx = this.viewW() / this.w;

    if (this.down && this.down.id === e.pointerId) {
      if (!this.dragging && Math.abs(e.clientX - this.down.x) > 8 && Math.abs(e.clientX - this.down.x) > Math.abs(e.clientY - this.down.y))
        this.dragging = true;
      if (this.dragging) {
        // Arrastrar corre el barral; las prendas se hamacan con el envión
        const before = this.panX;
        this.panX = this.clampPan(this.panX - dxPx * cmPerPx);
        if (this.openKey) this.open(null);
        this.nudge((this.panX - before) * 0.05 + dxPx * 0.004);
        this.start();
        return;
      }
    }

    const g = this.hit(e);
    const key = g?.item.key ?? null;
    // Pasar la mano por las prendas las empuja
    if (g && !this.opts.reducedMotion && e.pointerType === 'mouse') {
      const v = MathUtils.clamp(((dxPx * cmPerPx) / dt) * 1000, -260, 260);
      g.aVel += v * 0.0011;
      g.bVel += Math.abs(v) * 0.0004;
    }
    if (e.pointerType === 'mouse') this.hoverKey = key;
    this.opts.canvas.style.cursor = key ? 'pointer' : this.clampPan(1) > 0 ? 'grab' : '';
    this.start();
  };

  private onLeave = () => {
    this.hoverKey = null;
  };

  private onUp = (e: PointerEvent) => {
    if (!this.down || this.down.id !== e.pointerId) return;
    const wasDrag = this.dragging;
    const moved = Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y);
    this.down = null;
    this.dragging = false;
    if (wasDrag || moved > 10 || e.target !== this.opts.canvas) return;
    const g = this.hit(e);
    if (!g) this.open(null);
    else if (g.item.key === this.openKey) this.opts.onSelect(g.item.key);
    else this.open(g.item.key);
  };

  // ───────── Animación ─────────

  private start() {
    if (this.running || !this.visible || !this.hung.length) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      const dt = Math.min((now - this.last) / 1000, 0.05);
      this.last = now;
      this.step(dt);
      this.render();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  private stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private step(dt: number) {
    const still = this.opts.reducedMotion;
    this.time += dt;
    const open = this.hung.find((g) => g.item.key === this.openKey) ?? null;

    // Cámara: sigue a la prenda abierta y se aleja si no entra de ancho
    const baseW = (VIEW_H * this.w) / this.h;
    const zoomT = open ? MathUtils.clamp((open.width + 34) / baseW, 1, 1.7) : 1;
    const camT = open ? this.clampOpen(open.tx, zoomT) : this.panX;
    const k = still ? 1 : 1 - Math.exp(-dt * 5);
    this.zoom += (zoomT - this.zoom) * k;
    this.camX += (camT - this.camX) * k;

    for (const g of this.shown()) {
      const isOpen = g === open;
      // Lugar en el barral
      const px = g.x;
      g.x += (g.tx - g.x) * (still ? 1 : 1 - Math.exp(-dt * 7));
      g.z += ((isOpen ? OPEN_Z : 0) - g.z) * (still ? 1 : 1 - Math.exp(-dt * 6));
      const vx = dt > 0 ? (g.x - px) / dt : 0;
      const ax = dt > 0 ? (vx - g.vx) / dt : 0;
      g.vx = vx;

      // Giro sobre el gancho, con resorte
      const yawT = isOpen ? 0 : g.item.key === this.hoverKey ? PEEK_YAW : CLOSED_YAW;
      if (still) {
        g.yaw = yawT;
        g.yawVel = 0;
      } else {
        g.yawVel += (64 * (yawT - g.yaw) - 12.5 * g.yawVel) * dt;
        g.yaw += g.yawVel * dt;
      }

      // Péndulo: lo mueven la aceleración del gancho, los empujones y una brisa leve
      if (still) {
        g.a = g.b = g.aVel = g.bVel = 0;
      } else {
        const breeze = Math.sin(this.time * 0.6 + g.phase) * 0.05 + Math.sin(this.time * 1.31 + g.phase * 2.1) * 0.03;
        g.aVel += (-20 * g.a - 1.5 * g.aVel - MathUtils.clamp(ax, -900, 900) * 0.012 + breeze) * dt;
        g.bVel += (-22 * g.b - 1.7 * g.bVel + breeze * 0.6) * dt;
        g.a = MathUtils.clamp(g.a + g.aVel * dt, -0.4, 0.4);
        g.b = MathUtils.clamp(g.b + g.bVel * dt, -0.3, 0.3);
      }

      g.pivot.position.set(g.x, 0, g.z);
      g.swing.rotation.set(g.b, 0, g.a);
      g.turn.rotation.y = g.yaw;

      // Tela: el ruedo se atrasa respecto del balanceo y se tuerce con el giro
      const lagX = -g.aVel * 0.11;
      const lagZ = -g.bVel * 0.11;
      const c = Math.cos(g.yaw);
      const s = Math.sin(g.yaw);
      g.uniforms.sway.value.set(lagX * c - lagZ * s, lagX * s + lagZ * c);
      g.uniforms.customRotation.value = MathUtils.clamp(-g.yawVel * 0.075, -0.8, 0.8);
      g.uniforms.wind.value.x = this.time;
      g.uniforms.wind.value.y = still ? 0 : 0.014;
    }
  }

  /** La cámara centra la prenda abierta sin pasarse de los extremos del barral */
  private clampOpen(x: number, zoom: number) {
    const max = Math.max(0, this.rowHalf + 26 - (VIEW_H * zoom * this.w) / this.h / 2);
    return MathUtils.clamp(x, -max, max);
  }

  private render() {
    if (!this.hung.length) return;
    const vh = this.viewH();
    const dist = vh / 2 / TAN;
    // El barral queda siempre a la misma altura del lienzo, también al alejarse
    const camY = vh * (this.opts.railPx / this.h) - vh / 2;
    this.camera.position.set(this.camX, camY, dist);
    this.camera.lookAt(this.camX, camY, 0);
    this.key.position.set(this.camX - 96, 156, 600);
    this.key.target.position.set(this.camX, 0, 0);
    this.key.target.updateMatrixWorld();
    this.renderer.render(this.scene, this.camera);

    const open = this.hung.find((g) => g.item.key === this.openKey);
    if (open) {
      const v = new Vector3(open.x, open.bottom, open.z).project(this.camera);
      this.opts.onAnchor(((v.x + 1) / 2) * this.w, ((1 - v.y) / 2) * this.h);
    }
  }

  private resize() {
    const { clientWidth: w, clientHeight: h } = this.opts.canvas;
    if (!w || !h) return;
    this.w = w;
    this.h = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.panX = this.clampPan(this.panX);
    this.render();
  }

  dispose() {
    this.stop();
    this.ro.disconnect();
    const c = this.opts.canvas;
    c.removeEventListener('pointerdown', this.onDown);
    c.removeEventListener('pointermove', this.onMove);
    c.removeEventListener('pointerleave', this.onLeave);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onUp);
    this.scene.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      m.geometry.dispose();
      (m.material as MeshStandardMaterial).dispose();
    });
    this.scene.environment?.dispose();
    this.renderer.dispose();
  }
}
