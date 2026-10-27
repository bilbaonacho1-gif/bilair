import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  Box3,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  FogExp2,
  Group,
  HalfFloatType,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Points,
  PointsMaterial,
  Scene,
  ShaderMaterial,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Texture,
  UnsignedByteType,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
  type Object3D,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { TIMELINE } from './timeline';

/**
 * Intro de BILAIR: aproximación final sobre el Río de la Plata al atardecer.
 *
 * El avión aparece lejos con las luces de aterrizaje encendidas, vuela hacia la cámara,
 * pasa por encima y su paso abre un hueco en la escena por donde aparece la home.
 *
 * Se renderiza en dos capas (fondo y avión) y un pase final las compone con desenfoque
 * radial, recorte del fondo, viñeta y grano. El canvas es transparente: lo que se recorta
 * del fondo deja ver la página que está debajo.
 */

export interface IntroOptions {
  canvas: HTMLCanvasElement;
  modelUrl: string;
  lowPower: boolean;
  onProgress?: (ratio: number) => void;
}

const PLANE_LENGTH = 34; // metros, como un A319 real
const CAMERA_HEIGHT = 1.7;
const GLIDE = Math.tan(MathUtils.degToRad(3.2));

const D0 = 1500; // distancia inicial
const TA = 3.0; // fin del tramo exponencial
const DA = 150; // distancia al final de ese tramo
const V0 = (Math.log(D0 / DA) / TA) * DA; // velocidad en ese punto (~115 m/s)
const VP = 80; // velocidad al pasar sobre la cámara
const ACC = (V0 * V0 - VP * VP) / (2 * DA); // desaceleración del tramo final

/** Distancia del avión a la cámara (m) en función del tiempo. Positiva = delante. */
function distanceAt(t: number) {
  // Tramo exponencial: el tamaño aparente crece a ritmo constante, sin saltos
  if (t <= TA) return D0 * Math.exp((Math.log(DA / D0) / TA) * t);
  const tau = t - TA;
  const tPass = (V0 - VP) / ACC;
  if (tau <= tPass) return DA - V0 * tau + 0.5 * ACC * tau * tau;
  return -VP * (tau - tPass);
}

function glowTexture(size = 128, stretch = 1) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.translate(size / 2, size / 2);
  ctx.scale(1, stretch);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.12, 'rgba(255,248,235,0.9)');
  g.addColorStop(0.35, 'rgba(255,220,180,0.28)');
  g.addColorStop(1, 'rgba(255,200,150,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
  ctx.fill();
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/** Destello anamórfico: línea horizontal fina, como el de una lente de cine */
function streakTexture() {
  const w = 512;
  const h = 32;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const gx = ctx.createLinearGradient(0, 0, w, 0);
  gx.addColorStop(0, 'rgba(160,190,255,0)');
  gx.addColorStop(0.5, 'rgba(225,235,255,1)');
  gx.addColorStop(1, 'rgba(160,190,255,0)');
  ctx.fillStyle = gx;
  ctx.fillRect(0, 0, w, h);
  const gy = ctx.createLinearGradient(0, 0, 0, h);
  gy.addColorStop(0, 'rgba(0,0,0,1)');
  gy.addColorStop(0.5, 'rgba(0,0,0,0)');
  gy.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = gy;
  ctx.fillRect(0, 0, w, h);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

const compositeShader = (samples: number) => ({
  uniforms: {
    tBg: { value: null as Texture | null },
    tFg: { value: null as Texture | null },
    uCenter: { value: new Vector2(0.5, 0.5) },
    uBlur: { value: 0 },
    uWipe: { value: 0 },
    uExposure: { value: 1 },
    uAspect: { value: 1 },
    uTime: { value: 0 },
    uFade: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tBg;
    uniform sampler2D tFg;
    uniform vec2 uCenter;
    uniform float uBlur;
    uniform float uWipe;
    uniform float uExposure;
    uniform float uAspect;
    uniform float uTime;
    uniform float uFade;
    varying vec2 vUv;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

    void main() {
      vec2 dir = vUv - uCenter;
      vec4 bg = vec4(0.0);
      vec4 fg = vec4(0.0);
      float total = 0.0;
      // Desenfoque radial hacia el avión: velocidad, no un blur genérico
      for (int i = 0; i < ${samples}; i++) {
        // Jitter por píxel: convierte el escalonado del desenfoque en grano fino
        float t = (float(i) + hash(vUv * 731.0 + float(i))) / float(${samples});
        float w = 1.0 - t * 0.55;
        vec2 uv = vUv - dir * uBlur * 0.24 * t;
        bg += texture2D(tBg, uv) * w;
        fg += texture2D(tFg, uv) * w;
        total += w;
      }
      bg /= total;
      fg /= total;

      // El paso del avión abre un hueco en el fondo, desde su centro hacia afuera
      vec2 d = dir * vec2(uAspect, 1.0);
      float r = length(d) + (hash(floor(vUv * 220.0)) - 0.5) * 0.015;
      float keep = uWipe > 0.0 ? smoothstep(uWipe - 0.42, uWipe, r) : 1.0;

      vec3 col = bg.rgb * keep * (1.0 - fg.a) + fg.rgb;
      float alpha = keep * (1.0 - fg.a) + fg.a;

      float vig = smoothstep(1.35, 0.25, length((vUv - 0.5) * vec2(uAspect, 1.0)));
      col *= mix(1.0, vig, 0.55) * uExposure * uFade;

      gl_FragColor = vec4(col, alpha);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      gl_FragColor.rgb += (hash(vUv * 1000.0 + uTime) - 0.5) * 0.035 * alpha;
    }
  `,
});

interface Beacon {
  sprite: Sprite;
  kind: 'landing' | 'strobe' | 'beacon';
  base: number;
}

export class IntroScene {
  private renderer: WebGLRenderer;
  private bgScene = new Scene();
  private fgScene = new Scene();
  private postScene = new Scene();
  private postCam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private camera = new PerspectiveCamera(36, 1, 0.5, 30000);
  private bgRT: WebGLRenderTarget;
  private fgRT: WebGLRenderTarget;
  private post: ShaderMaterial;
  private plane = new Group();
  private beacons: Beacon[] = [];
  private streak: Sprite | null = null;
  private strobes: Points | null = null;
  private strobeCount = 0;
  private opts: IntroOptions;
  private raf = 0;
  private start = 0;
  private t = 0;
  private yaw = 0;
  private pitch = 0;
  private ro: ResizeObserver;
  private onEnd: (() => void) | null = null;
  private onReveal: (() => void) | null = null;
  private revealed = false;

  constructor(opts: IntroOptions) {
    this.opts = opts;
    const r = new WebGLRenderer({ canvas: opts.canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio, opts.lowPower ? 1 : 1.6));
    r.toneMapping = ACESFilmicToneMapping;
    r.toneMappingExposure = 0.5;
    r.outputColorSpace = SRGBColorSpace;
    r.setClearColor(0x000000, 0);
    this.renderer = r;

    const halfFloat = r.extensions.has('EXT_color_buffer_float') || r.extensions.has('EXT_color_buffer_half_float');
    const rtOpts = { type: halfFloat ? HalfFloatType : UnsignedByteType, samples: opts.lowPower ? 0 : 4 };
    this.bgRT = new WebGLRenderTarget(1, 1, rtOpts);
    this.fgRT = new WebGLRenderTarget(1, 1, rtOpts);

    this.post = new ShaderMaterial({ ...compositeShader(opts.lowPower ? 8 : 14), transparent: true, depthTest: false, depthWrite: false });
    this.post.uniforms.tBg.value = this.bgRT.texture;
    this.post.uniforms.tFg.value = this.fgRT.texture;
    this.postScene.add(new Mesh(new PlaneGeometry(2, 2), this.post));

    this.buildWorld();

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(opts.canvas);
    this.resize();
  }

  /** Cielo, agua, luces de aproximación y horizonte */
  private buildWorld() {
    const lowPower = this.opts.lowPower;
    // Sol bajo, delante y a la izquierda: el avión llega a contraluz
    const sunDir = new Vector3().setFromSphericalCoords(1, MathUtils.degToRad(90 - 0.6), MathUtils.degToRad(212));

    const sky = new Sky();
    sky.scale.setScalar(20000);
    sky.frustumCulled = false;
    const u = sky.material.uniforms;
    u.turbidity.value = 6.5;
    u.rayleigh.value = 3.2;
    u.mieCoefficient.value = 0.0028;
    u.mieDirectionalG.value = 0.82;
    u.sunPosition.value.copy(sunDir);
    u.cloudCoverage.value = 0.38;
    u.cloudDensity.value = 0.55;
    u.cloudElevation.value = 0.35;
    this.bgScene.add(sky);

    // Reflejos del cielo en el agua y en el fuselaje
    const envScene = new Scene();
    const envSky = new Sky();
    envSky.scale.setScalar(50);
    envSky.material.uniforms.sunPosition.value.copy(sunDir);
    envSky.material.uniforms.turbidity.value = 6.5;
    envSky.material.uniforms.rayleigh.value = 3.2;
    envSky.material.uniforms.cloudCoverage.value = 0;
    envScene.add(envSky);
    const pmrem = new PMREMGenerator(this.renderer);
    const env = pmrem.fromScene(envScene, 0.02).texture;
    pmrem.dispose();
    this.bgScene.environment = env;
    this.fgScene.environment = env;
    this.fgScene.environmentIntensity = 0.9;

    const fogColor = new Color('#b98a6f');
    this.bgScene.fog = new FogExp2(fogColor, 0.00034);
    this.fgScene.fog = new FogExp2(fogColor, 0.00034);

    // Río de la Plata: agua calma que refleja el cielo
    const water = new Mesh(
      new PlaneGeometry(60000, 60000),
      new MeshStandardMaterial({ color: '#070a0e', metalness: 0, roughness: 0.14, envMapIntensity: 1.1 }),
    );
    water.rotation.x = -Math.PI / 2;
    this.bgScene.add(water);

    const glow = glowTexture();
    // Luces de aproximación sobre pilotes en el agua: filas cada 30 m hacia el avión
    const pos: number[] = [];
    const refl: number[] = [];
    for (let z = -24; z > -900; z -= 30) {
      const bar = Math.abs(z + 300) < 15 ? 15 : 2;
      for (let x = -bar; x <= bar; x += bar > 2 ? 1.5 : 1) {
        pos.push(x, 2.4, z);
        refl.push(x, -2.4, z);
      }
    }
    const lightsMat = new PointsMaterial({
      map: glow,
      color: '#ffd9a8',
      size: 0.9,
      opacity: 0.65,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    const lights = new Points(new BufferGeometry().setAttribute('position', new BufferAttribute(new Float32Array(pos), 3)), lightsMat);
    const reflMat = lightsMat.clone();
    reflMat.opacity = 0.28;
    reflMat.size = 1.8;
    const reflections = new Points(new BufferGeometry().setAttribute('position', new BufferAttribute(new Float32Array(refl), 3)), reflMat);
    this.bgScene.add(lights, reflections);

    // Destellos secuenciales ("el conejo") que corren hacia la pista
    const strobePos: number[] = [];
    for (let z = -900; z < -24; z += 30) strobePos.push(0, 3, z);
    this.strobeCount = strobePos.length / 3;
    const strobeGeo = new BufferGeometry();
    strobeGeo.setAttribute('position', new BufferAttribute(new Float32Array(strobePos), 3));
    strobeGeo.setAttribute('color', new BufferAttribute(new Float32Array(this.strobeCount * 3), 3));
    this.strobes = new Points(
      strobeGeo,
      new PointsMaterial({ map: glow, size: 7, vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false }),
    );
    this.bgScene.add(this.strobes);

    // Costa y barcos a lo lejos: luces mínimas sobre el horizonte
    const far: number[] = [];
    const n = lowPower ? 160 : 420;
    for (let i = 0; i < n; i++) {
      const a = MathUtils.degToRad(MathUtils.randFloat(120, 250));
      const dist = MathUtils.randFloat(5500, 9000);
      far.push(Math.sin(a) * dist, Math.random() < 0.85 ? MathUtils.randFloat(1, 18) : MathUtils.randFloat(20, 90), Math.cos(a) * dist);
    }
    const farLights = new Points(
      new BufferGeometry().setAttribute('position', new BufferAttribute(new Float32Array(far), 3)),
      new PointsMaterial({
        map: glow,
        color: '#ffb57a',
        size: 2.2,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0.55,
        blending: AdditiveBlending,
        depthWrite: false,
        fog: false,
      }),
    );
    this.bgScene.add(farLights);

    // Luz: sol rasante a contraluz + relleno frío del cielo
    const sun = new DirectionalLight('#ffc89a', 2.4);
    sun.position.copy(sunDir).multiplyScalar(100);
    const fill = new DirectionalLight('#9fb4d6', 0.9);
    fill.position.set(10, 20, 60);
    const hemi = new HemisphereLight('#a9b8d0', '#4a3a30', 0.7);
    this.fgScene.add(sun, fill, hemi);
    this.bgScene.add(new HemisphereLight('#a9b8d0', '#2a2420', 0.6));

    this.fgScene.add(this.plane);
  }

  async load() {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync(this.opts.modelUrl, (e) => e.total && this.opts.onProgress?.(e.loaded / e.total));
    const model = gltf.scene;

    let box = new Box3().setFromObject(model);
    const size = box.getSize(new Vector3());
    model.scale.setScalar(PLANE_LENGTH / Math.max(size.x, size.z));
    box = new Box3().setFromObject(model);
    model.position.sub(box.getCenter(new Vector3()));
    box = new Box3().setFromObject(model);

    // La deriva es el punto más alto: si está hacia +Z, el morro mira a -Z y hay que girarlo
    let tailZ = 0;
    let maxY = -Infinity;
    model.updateMatrixWorld(true);
    model.traverse((o: Object3D) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      const p = mesh.geometry.attributes.position;
      const v = new Vector3();
      for (let i = 0; i < p.count; i += 7) {
        v.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld);
        if (v.y > maxY) {
          maxY = v.y;
          tailZ = v.z;
        }
      }
      const m = mesh.material as MeshStandardMaterial;
      if (m?.isMeshStandardMaterial) {
        m.metalness = 0.15;
        m.roughness = Math.min(m.roughness ?? 1, 0.5);
        m.envMapIntensity = 1;
      }
    });
    const pivot = new Group();
    pivot.add(model);
    if (tailZ > 0) pivot.rotation.y = Math.PI; // morro hacia +Z: hacia la cámara
    this.plane.add(pivot);

    // Luces del avión, en coordenadas relativas al tamaño real
    const L = PLANE_LENGTH;
    const belly = box.min.y;
    const span = Math.max(box.max.x, -box.min.x);
    const glow = glowTexture();
    const add = (x: number, y: number, z: number, color: string, kind: Beacon['kind'], base: number) => {
      const s = new Sprite(new SpriteMaterial({ map: glow, color, blending: AdditiveBlending, depthWrite: false, sizeAttenuation: false, fog: false }));
      s.position.set(x, y, z);
      this.plane.add(s);
      this.beacons.push({ sprite: s, kind, base });
    };
    add(-0.12 * L, belly + 0.09 * L, 0.12 * L, '#fff4e0', 'landing', 1);
    add(0.12 * L, belly + 0.09 * L, 0.12 * L, '#fff4e0', 'landing', 1);
    add(0, belly + 0.02 * L, 0.36 * L, '#fffaf0', 'landing', 0.8);
    add(-span * 0.97, belly + 0.16 * L, -0.05 * L, '#ffffff', 'strobe', 0.6);
    add(span * 0.97, belly + 0.16 * L, -0.05 * L, '#ffffff', 'strobe', 0.6);
    add(0, belly + 0.005 * L, 0, '#ff3b2e', 'beacon', 0.5);

    const streak = new Sprite(
      new SpriteMaterial({ map: streakTexture(), color: '#cfe0ff', blending: AdditiveBlending, depthWrite: false, sizeAttenuation: false, fog: false }),
    );
    streak.position.set(0, belly + 0.08 * L, 0.2 * L);
    this.plane.add(streak);
    this.streak = streak;

    this.opts.onProgress?.(1);
    this.update(0);
  }

  play(handlers: { onReveal: () => void; onEnd: () => void }) {
    this.onReveal = handlers.onReveal;
    this.onEnd = handlers.onEnd;
    this.start = performance.now();
    const loop = (now: number) => {
      this.t = (now - this.start) / 1000;
      this.update(this.t);
      this.render();
      if (this.t >= TIMELINE.reveal && !this.revealed) {
        this.revealed = true;
        this.onReveal?.();
      }
      if (this.t >= TIMELINE.end) {
        this.onEnd?.();
        return;
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  /**
   * Dibuja un único cuadro en el instante t, para capturas y pruebas.
   * `clean` quita desenfoque, recorte y vibración (para la foto de la home).
   */
  still(t: number, clean = true) {
    if (!clean) for (let tt = 0; tt < t; tt += 1 / 60) this.update(tt);
    this.update(t, clean);
    this.render();
  }

  /** Corta la secuencia sin disparar más callbacks (botón "Saltar intro") */
  stop() {
    cancelAnimationFrame(this.raf);
    this.onReveal = null;
    this.onEnd = null;
  }

  private update(t: number, still = false) {
    const d = distanceAt(t);
    const near = MathUtils.clamp(1 - d / 160, 0, 1);

    // Trayectoria: senda de planeo de 3,2°, entrando levemente desde la derecha
    const x = Math.max(d, 0) * 0.032 + Math.sin(t * 0.8) * 0.6 * (1 - near);
    const y = 15 + Math.max(d, 0) * GLIDE;
    this.plane.position.set(x, y, -d);
    // Actitud de aterrizaje: morro arriba, pequeñas correcciones de alabeo que se apagan al acercarse
    this.plane.rotation.set(-0.055, -0.02 * (1 - near), Math.sin(t * 1.1 + 0.6) * 0.045 * (1 - near) + 0.012);

    // Cámara: parada en el muelle, sigue al avión con el retraso de un operador real
    const cam = this.camera;
    cam.position.set(0, CAMERA_HEIGHT, 0);
    const dir = new Vector3().copy(this.plane.position).sub(cam.position);
    // Ángulo de elevación medido desde el frente: supera 90° cuando el avión ya pasó por encima
    let targetPitch = Math.atan2(dir.y, -dir.z);
    const compose = MathUtils.degToRad(5.5) * (1 - near); // de lejos, el avión queda por encima del centro
    // Tope de 46°: el avión sale por arriba del cuadro y el cielo del atardecer sigue en pantalla
    targetPitch = Math.min(targetPitch - compose, MathUtils.degToRad(46));
    const targetYaw = Math.atan2(-dir.x, -dir.z) * (dir.z < 0 ? 1 : 0);
    if (still || t === 0) {
      this.pitch = targetPitch;
      this.yaw = targetYaw;
    } else {
      const k = 1 - Math.exp(-(near > 0.6 ? 5.5 : 9) * 0.016);
      this.pitch += (targetPitch - this.pitch) * k;
      this.yaw += (targetYaw - this.yaw) * k;
    }
    // Vibración: crece con el rugido del avión, máxima en el paso
    const pass = Math.exp(-(((t - TIMELINE.pass) / 0.22) ** 2));
    const shake = (0.0015 * near * near + 0.012 * pass) * (still ? 0 : 1);
    cam.rotation.order = 'YXZ';
    cam.rotation.set(
      this.pitch + Math.sin(t * 37) * shake + Math.sin(t * 23.3) * shake * 0.6,
      this.yaw + Math.sin(t * 29.1) * shake * 0.8,
      Math.sin(t * 17.7) * shake * 0.5,
    );
    cam.updateMatrixWorld();

    // Luces: encandilan de frente y se apagan cuando el avión deja de mirarnos
    const forward = new Vector3(0, 0, 1).applyEuler(this.plane.rotation);
    const toCam = new Vector3().copy(cam.position).sub(this.plane.position).normalize();
    const facing = Math.max(0, forward.dot(toCam)) ** 6;
    for (const b of this.beacons) {
      const m = b.sprite.material;
      if (b.kind === 'landing') {
        const s = (0.016 + 0.05 * near * near) * b.base * (0.35 + 0.65 * facing);
        b.sprite.scale.set(s, s, 1);
        m.opacity = Math.min(1, 0.4 + facing);
      } else if (b.kind === 'strobe') {
        const on = t % 1.1 < 0.06 ? 1 : 0;
        const s = 0.022 * on * b.base;
        b.sprite.scale.set(s, s, 1);
      } else {
        const on = 0.5 + 0.5 * Math.sin(t * 6.5);
        const s = 0.012 * on;
        b.sprite.scale.set(s, s, 1);
      }
    }
    if (this.streak) {
      const s = (0.25 + 0.9 * near) * facing;
      this.streak.scale.set(s, s * 0.035, 1);
      this.streak.material.opacity = 0.75 * facing;
    }

    // "Conejo": dos destellos por segundo que corren hacia nosotros
    if (this.strobes) {
      const col = this.strobes.geometry.attributes.color as BufferAttribute;
      const head = ((t * 2) % 1) * this.strobeCount;
      for (let i = 0; i < this.strobeCount; i++) {
        const v = Math.max(0, 1 - Math.abs(i - head) * 1.6);
        col.setXYZ(i, v * 0.9, v * 0.95, v);
      }
      col.needsUpdate = true;
    }

    // Composición final
    const center = this.plane.position.clone().project(cam);
    const cx = MathUtils.clamp(center.x * 0.5 + 0.5, -0.2, 1.2);
    const cy = MathUtils.clamp(center.y * 0.5 + 0.5, -0.2, 1.4);
    const u = this.post.uniforms;
    if (center.z < 1) u.uCenter.value.set(cx, cy);
    u.uBlur.value = still ? 0 : Math.exp(-(((t - (TIMELINE.pass - 0.12)) / 0.32) ** 2)) * 0.9 + near * near * 0.06;
    const w = MathUtils.clamp((t - TIMELINE.reveal) / 0.75, 0, 1);
    u.uWipe.value = still ? 0 : w > 0 ? 0.05 + w * w * 2.6 : 0;
    u.uExposure.value = 1 - 0.2 * pass;
    u.uFade.value = still ? 1 : MathUtils.smoothstep(t, 0, 0.9);
    u.uTime.value = t;
  }

  private render() {
    const r = this.renderer;
    r.setRenderTarget(this.bgRT);
    r.setClearColor(0x000000, 1);
    r.clear();
    r.render(this.bgScene, this.camera);
    r.setRenderTarget(this.fgRT);
    r.setClearColor(0x000000, 0);
    r.clear();
    r.render(this.fgScene, this.camera);
    r.setRenderTarget(null);
    r.clear();
    r.render(this.postScene, this.postCam);
  }

  private resize() {
    const { clientWidth: w, clientHeight: h } = this.opts.canvas;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    const pr = this.renderer.getPixelRatio();
    this.bgRT.setSize(Math.round(w * pr), Math.round(h * pr));
    this.fgRT.setSize(Math.round(w * pr), Math.round(h * pr));
    const aspect = w / h;
    this.camera.aspect = aspect;
    // En vertical se abre el lente para que el avión entre de punta a punta
    this.camera.fov = aspect < 1 ? 58 : 36;
    this.camera.updateProjectionMatrix();
    this.post.uniforms.uAspect.value = aspect;
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    const free = (o: Object3D) => {
      const mesh = o as Mesh;
      mesh.geometry?.dispose?.();
      const m = mesh.material as MeshStandardMaterial | MeshStandardMaterial[] | undefined;
      (Array.isArray(m) ? m : m ? [m] : []).forEach((mat) => {
        mat.map?.dispose();
        mat.normalMap?.dispose();
        mat.dispose();
      });
    };
    this.bgScene.traverse(free);
    this.fgScene.traverse(free);
    this.bgScene.environment?.dispose();
    this.bgRT.dispose();
    this.fgRT.dispose();
    this.post.dispose();
    this.renderer.dispose();
  }
}
