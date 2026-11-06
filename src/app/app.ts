import { Component, OnDestroy, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { Preloader } from './components/preloader/preloader';
import * as THREE from 'three';

interface SkillBubble {
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
}

// Ajustes del efecto líquido (para afinar la sensación)
const FLUID = {
  pointerEase: 0.07,   // 0.03 = muy perezoso, 0.2 = más reactivo
  velocityEase: 0.12,  // suavizado de la velocidad
  radius: 0.16,        // tamaño de la "mano" sobre el agua
  gain: 5.0,           // cuánta fuerza inyecta el cursor
  decay: 0.985,        // 0.97 = estela corta, 0.992 = estela larga
  diffusion: 0.35,     // cuánto se "esparce" la estela
  distortion: 0.9,     // intensidad de la deformación del color
  maxSpeed: 0.035      // límite de velocidad del cursor
};

// Geometría de la carpeta (en px). Controla el dibujo del contorno
const FOLDER_SHAPE = {
  tabHeight: 44,   // alto de la pestaña
  tabWidth: 240,   // ancho de la pestaña (incluye la curva de bajada)
  tabRadius: 16,   // redondeo de la esquina superior izquierda de la pestaña
  curve: 36,       // longitud de la curva que baja de la pestaña al cuerpo
  radius: 22,      // redondeo de las esquinas del cuerpo
  frontGap: 14     // separación entre el borde del fondo y el de la hoja frontal
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [Preloader],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnDestroy {

  skills = [
    'ANGULAR',
    'TYPESCRIPT',
    'JAVASCRIPT',
    'HTML',
    'CSS',
    'UX/UI',
    'FIGMA',
    'PYTHON',
    'DJANGO',
    'REST FRAMEWORK',
    'MYSQL',
    'POSTGRESQL',
    'FLUTTER'
  ];

  skillShortNames: Record<string, string> = {
    ANGULAR: 'NG',
    TYPESCRIPT: 'TS',
    JAVASCRIPT: 'JS',
    HTML: 'HTML',
    CSS: 'CSS',
    'UX/UI': 'UX/UI',
    FIGMA: 'FIG',
    PYTHON: 'PY',
    DJANGO: 'DJ',
    'REST FRAMEWORK': 'REST',
    MYSQL: 'SQL',
    POSTGRESQL: 'PG',
    FLUTTER: 'FL'
  };

  skillLevels: Record<string, number> = {
    ANGULAR: 7,
    TYPESCRIPT: 6,
    JAVASCRIPT: 7,
    HTML: 10,
    CSS: 8,
    'UX/UI': 6,
    FIGMA: 7,
    PYTHON: 9,
    DJANGO: 8,
    'REST FRAMEWORK': 7,
    MYSQL: 7,
    POSTGRESQL: 7,
    FLUTTER: 6
  };

  // Silueta de carpeta
  readonly folderShape = FOLDER_SHAPE;

  folderPath = '';
  folderFrontPath = '';
  folderSize = { w: 0, h: 0 };
  folderTabWidth = FOLDER_SHAPE.tabWidth;
    // Texto secundario de "Sobre mí" (una palabra por span)
  aboutWords =
    'Apasionado por la búsqueda de soluciones mediante software, hambriento de conocimiento.'
      .split(' ');

  // Tema de fondo según la sección visible
  private themeSections: HTMLElement[] = [];
  private themeFrame?: number;
  private readonly themeLine = 0.55; // altura del viewport donde "cambia" de sección

  @ViewChild('folder')
  folder?: ElementRef<HTMLDivElement>;

  private folderResizeObserver?: ResizeObserver;

  get activeProjectLabel(): string {
    for (const group of this.projectGroups) {
      const item = group.items.find(i => i.id === this.activeProject);
      if (item) return item.label;
    }
    return '';
  }

  projectGroups = [
    {
      title: 'Proyectos',
      items: [
        { id: 'fuelprice', label: 'FuelPrice' },
        { id: 'autophoto', label: 'AutoPhoto' },
        { id: 'stayhere', label: 'Stayhere' }
      ]
    },
    {
      title: 'Experiencia',
      items: [
        { id: 'wynix', label: 'Wynix' },
        { id: 'agile-solutions', label: 'Agile Solutions' }
      ]
    },
    {
      title: 'Otros proyectos',
      items: [
        { id: 'work-together', label: 'Work Together' },
        { id: 'nfc-access', label: 'NFC Access' },
        { id: 'ticket-manager', label: 'Ticket Manager' },
        { id: 'detector-blancos', label: 'Detector de blancos' }
      ]
    }
  ];

  activeProject = 'fuelprice';

  @ViewChild('documentsPanel')
  documentsPanel?: ElementRef<HTMLDivElement>;
  
  private projectsObserver?: IntersectionObserver;
  private programmaticScroll = false;
  private scrollReleaseTimer?: ReturnType<typeof setTimeout>;

  private bubbleMouse = {
    x: 0,
    y: 0,
    active: false
  };

  showBubbles = false;

  skillBubbles: SkillBubble[] = [];

  @ViewChild('bubbleArea')
  bubbleArea?: ElementRef<HTMLDivElement>;

  @ViewChild('technologySection')
  technologySection?: ElementRef<HTMLDivElement>;

  @ViewChild('fluidCanvas')
  fluidCanvas?: ElementRef<HTMLCanvasElement>;

  @ViewChild('pageContainer')
  pageContainer?: ElementRef<HTMLElement>;
  // Fondo líquido WebGL

  private fluidRenderer?: THREE.WebGLRenderer;
  private fluidScene?: THREE.Scene;
  private fluidCamera?: THREE.OrthographicCamera;
  private fluidMaterial?: THREE.ShaderMaterial;
  private fluidGeometry?: THREE.PlaneGeometry;

  private fluidAnimationFrame?: number;
  private fluidResizeObserver?: ResizeObserver;

  // Cursor suavizado
  private targetPointer = new THREE.Vector2(0.5, 0.5);
  private smoothPointer = new THREE.Vector2(0.5, 0.5);
  private lastSmoothPointer = new THREE.Vector2(0.5, 0.5);
  private pointerVelocity = new THREE.Vector2();
  private pointerActive = false;
  private pointerInitialized = false;

  // Flow map (ping-pong)
  private flowTargets: THREE.WebGLRenderTarget[] = [];
  private flowScene?: THREE.Scene;
  private flowMaterial?: THREE.ShaderMaterial;
  private flowGeometry?: THREE.PlaneGeometry;
  private lastFluidTime = 0;

  private bubbleAnimationFrame?: number;
  private lastBubbleFrame = 0;

  isLoading: boolean = true;
  showPreloader = true;
  introReady = false;

  private technologyGroups = [
    ['Python', 'SQL', 'JS', 'Django'],
    ['.NET', 'REST', 'ANGULAR', 'TS']
  ];

  private currentGroup = 0;

  technologyLetters = this.createGroup(
    this.technologyGroups[this.currentGroup]
  );

  private cycleTimer?: ReturnType<typeof setTimeout>;
  private letterTimers: ReturnType<typeof setTimeout>[] = [];
  private destroyed = false;
  private started = false;

  constructor(private cdr: ChangeDetectorRef) {}

  private createGroup(words: string[]) {
    return words.map(word =>
      [...word].map(value => ({
        value,
        hidden: false
      }))
    );
  }

  onLoadingComplete(): void {
    this.isLoading = false;

    this.cdr.detectChanges();

    this.startTechnologyCycle();

    requestAnimationFrame(() => {
      this.initializeFluidBackground();
      this.initializeProjectsObserver();
      this.initializeFolderOutline();
      this.initializeThemeScroll();
    });
  }

  onRevealStart(): void {
    // Arranca la animación de entrada de la portada
    this.introReady = true;
    this.cdr.detectChanges();
  }

  onRevealEnd(): void {
    this.showPreloader = false;
    this.cdr.detectChanges();
  }

  private startTechnologyCycle(): void {
    if (this.started || this.destroyed) return;

    this.started = true;
    this.runTechnologyCycle();
  }

  private runTechnologyCycle(): void {
    if (this.destroyed) return;

    // Mantener las tecnologías durante 2 segundos
    this.cycleTimer = setTimeout(() => {
      this.changeTechnologies();
    }, 2000);
  }

  private changeTechnologies(): void {
    if (this.destroyed) return;

    const nextGroup = (this.currentGroup + 1) % this.technologyGroups.length;
    const newWords = this.technologyGroups[nextGroup];

    this.technologyLetters.forEach((letters, wordIndex) => {
      const wordDelay = wordIndex * 200;

      // Desaparecer las letras actuales individualmente
      letters.forEach((letter, letterIndex) => {
        const timer = setTimeout(() => {
          if (this.destroyed) return;

          letter.hidden = true;
          this.cdr.detectChanges();

        }, wordDelay + letterIndex * 150);

        this.letterTimers.push(timer);
      });

      // Sustituir la palabra cuando haya desaparecido
      const replacementDelay =
        wordDelay + Math.max(0, letters.length - 1) * 150 + 350;

      const replaceTimer = setTimeout(() => {
        if (this.destroyed) return;

        this.technologyLetters[wordIndex] = [...newWords[wordIndex]].map(value => ({
          value,
          hidden: true
        }));

        this.cdr.detectChanges();

        // Mostrar las nuevas letras individualmente
        this.technologyLetters[wordIndex].forEach((letter, letterIndex) => {
          const revealTimer = setTimeout(() => {
            if (this.destroyed) return;

            letter.hidden = false;
            this.cdr.detectChanges();

          }, letterIndex * 150);

          this.letterTimers.push(revealTimer);
        });

      }, replacementDelay);

      this.letterTimers.push(replaceTimer);
    });

    // Completar el cambio después de 3 segundos
    this.cycleTimer = setTimeout(() => {
      if (this.destroyed) return;

      this.letterTimers.forEach(timer => clearTimeout(timer));
      this.letterTimers = [];

      this.currentGroup = nextGroup;

      // Mantener el nuevo grupo y repetir el ciclo
      this.runTechnologyCycle();

    }, 3000);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.projectsObserver?.disconnect();
    this.folderResizeObserver?.disconnect();
    this.documentsPanel?.nativeElement.removeEventListener('scroll', this.onProjectsScroll);
    clearTimeout(this.scrollReleaseTimer);

    this.pageContainer?.nativeElement.removeEventListener('scroll', this.onPageScroll);

    if (this.themeFrame !== undefined) {
      cancelAnimationFrame(this.themeFrame);
    }

    if (this.cycleTimer) {
      clearTimeout(this.cycleTimer);
    }

    // Detener animación del fondo líquido
    if (this.fluidAnimationFrame !== undefined) {
      cancelAnimationFrame(this.fluidAnimationFrame);
      this.fluidAnimationFrame = undefined;
    }

    // Detener animación de las burbujas
    if (this.bubbleAnimationFrame !== undefined) {
      cancelAnimationFrame(this.bubbleAnimationFrame);
      this.bubbleAnimationFrame = undefined;
    }

    // Liberar observador de tamaño
    this.fluidResizeObserver?.disconnect();

    // Liberar recursos de Three.js
    this.flowTargets.forEach(target => target.dispose());
    this.flowGeometry?.dispose();
    this.flowMaterial?.dispose();
    this.fluidGeometry?.dispose();
    this.fluidMaterial?.dispose();
    this.fluidRenderer?.dispose();

    this.letterTimers.forEach(timer => clearTimeout(timer));
    this.letterTimers = [];
  }

  toggleSkillsView(): void {
    this.showBubbles = !this.showBubbles;

    if (this.showBubbles) {
      this.cdr.detectChanges();

      requestAnimationFrame(() => {
        this.initializeBubbles();
        this.lastBubbleFrame = 0;
        this.animateBubbles();
      });
    } else {
      if (this.bubbleAnimationFrame !== undefined) {
        cancelAnimationFrame(this.bubbleAnimationFrame);
        this.bubbleAnimationFrame = undefined;
      }
    }
  }

  private initializeFluidBackground(): void {
    const canvas = this.fluidCanvas?.nativeElement;
    const section = this.technologySection?.nativeElement;

    if (!canvas || !section || this.fluidRenderer) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.fluidRenderer = renderer;

    this.fluidScene = new THREE.Scene();
    this.flowScene = new THREE.Scene();
    this.fluidCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.fluidGeometry = new THREE.PlaneGeometry(2, 2);
    this.flowGeometry = new THREE.PlaneGeometry(2, 2);

    // Texturas del flow map (baja resolución = más suave y barato)
    const size = 256;
    const createTarget = () =>
      new THREE.WebGLRenderTarget(size, size, {
        type: THREE.HalfFloatType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping,
        depthBuffer: false
      });

    this.flowTargets = [createTarget(), createTarget()];

    // ---------- Pasada 1: simulación del flujo ----------
    this.flowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uPrev: { value: this.flowTargets[0].texture },
        uPointer: { value: this.smoothPointer },
        uVelocity: { value: new THREE.Vector2() },
        uAspect: { value: 1 },
        uRadius: { value: FLUID.radius },
        uDecay: { value: FLUID.decay },
        uDiffusion: { value: FLUID.diffusion },
        uTexel: { value: new THREE.Vector2(1 / size, 1 / size) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uPrev;
        uniform vec2 uPointer;
        uniform vec2 uVelocity;
        uniform vec2 uTexel;
        uniform float uAspect;
        uniform float uRadius;
        uniform float uDecay;
        uniform float uDiffusion;

        varying vec2 vUv;

        void main() {
          vec2 prev = texture2D(uPrev, vUv).xy;

          // Difusión: el agua se esparce suavemente
          vec2 blur = (
            texture2D(uPrev, vUv + vec2(uTexel.x, 0.0)).xy +
            texture2D(uPrev, vUv - vec2(uTexel.x, 0.0)).xy +
            texture2D(uPrev, vUv + vec2(0.0, uTexel.y)).xy +
            texture2D(uPrev, vUv - vec2(0.0, uTexel.y)).xy
          ) * 0.25;

          vec2 flow = mix(prev, blur, uDiffusion) * uDecay;

          // Aporte del cursor (gaussiana suave)
          vec2 d = vUv - uPointer;
          d.x *= uAspect;
          float splat = exp(-dot(d, d) / (uRadius * uRadius));

          flow += uVelocity * splat;

          gl_FragColor = vec4(flow, 0.0, 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false
    });

    this.flowScene.add(new THREE.Mesh(this.flowGeometry, this.flowMaterial));

    // ---------- Pasada 2: fondo con degradado deformado ----------
    this.fluidMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uFlow: { value: this.flowTargets[0].texture },
        uDistortion: { value: FLUID.distortion }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform sampler2D uFlow;
        uniform float uDistortion;

        varying vec2 vUv;

        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }

        float noise(vec2 st) {
          vec2 i = floor(st);
          vec2 f = fract(st);
          f = f * f * (3.0 - 2.0 * f);

          float a = random(i);
          float b = random(i + vec2(1.0, 0.0));
          float c = random(i + vec2(0.0, 1.0));
          float d = random(i + vec2(1.0, 1.0));

          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        float fbm(vec2 st) {
          float value = 0.0;
          float amplitude = 0.5;
          for (int i = 0; i < 4; i++) {
            value += noise(st) * amplitude;
            st *= 2.0;
            amplitude *= 0.5;
          }
          return value;
        }

        float cloud(vec2 uv, vec2 center, vec2 scale, float turbulence) {
          vec2 position = (uv - center) * scale;
          float dist = length(position);
          dist += (turbulence - 0.5) * 0.22;
          return 1.0 - smoothstep(0.05, 0.85, dist);
        }

        void main() {
          vec2 uv = vUv;

          // Movimiento autónomo y tranquilo
          float noiseX = fbm(uv * 3.0 + vec2(uTime * 0.025, -uTime * 0.018));
          float noiseY = fbm(uv * 4.0 - vec2(uTime * 0.018, uTime * 0.02));
          uv += (vec2(noiseX, noiseY) - 0.5) * 0.035;

          // Deformación líquida desde el flow map
          vec2 flow = texture2D(uFlow, vUv).xy;
          uv -= flow * uDistortion;

          float turbulence = fbm(uv * 5.0 + vec2(uTime * 0.015, -uTime * 0.02));

          vec3 background = vec3(23.0, 19.0, 43.0) / 255.0;
          vec3 lavender   = vec3(181.0, 199.0, 235.0) / 255.0;
          vec3 purple     = vec3(117.0, 72.0, 189.0) / 255.0;
          vec3 blue       = vec3(36.0, 127.0, 165.0) / 255.0;
          vec3 pale       = vec3(230.0, 230.0, 250.0) / 255.0;

          vec2 center1 = vec2(0.20 + sin(uTime * 0.12) * 0.08, 0.72 + cos(uTime * 0.10) * 0.06);
          vec2 center2 = vec2(0.78 + cos(uTime * 0.11) * 0.07, 0.78 + sin(uTime * 0.13) * 0.06);
          vec2 center3 = vec2(0.76 + sin(uTime * 0.09) * 0.08, 0.22 + cos(uTime * 0.12) * 0.06);
          vec2 center4 = vec2(0.18 + cos(uTime * 0.10) * 0.07, 0.25 + sin(uTime * 0.11) * 0.06);

          float mask1 = cloud(uv, center1, vec2(1.1, 1.0), turbulence);
          float mask2 = cloud(uv, center2, vec2(1.0, 1.2), turbulence);
          float mask3 = cloud(uv, center3, vec2(1.0, 1.1), turbulence);
          float mask4 = cloud(uv, center4, vec2(1.2, 1.0), turbulence);

          vec3 color = background;
          color = mix(color, purple,   mask2 * 0.85);
          color = mix(color, blue,     mask3 * 0.90);
          color = mix(color, pale,     mask4 * 0.75);
          color = mix(color, lavender, mask1 * 0.90);

          gl_FragColor = vec4(color, 1.0);
        }
      `
    });

    this.fluidScene.add(new THREE.Mesh(this.fluidGeometry, this.fluidMaterial));

    const resize = (): void => {
      const width = section.clientWidth;
      const height = section.clientHeight;
      if (!width || !height) return;

      renderer.setSize(width, height, false);
      this.flowMaterial!.uniforms['uAspect'].value = width / height;
    };

    resize();
    this.fluidResizeObserver = new ResizeObserver(resize);
    this.fluidResizeObserver.observe(section);

    this.animateFluidBackground();
  }

  private animateFluidBackground = (timestamp = 0): void => {
    if (
      !this.fluidRenderer || !this.fluidMaterial || !this.flowMaterial ||
      !this.fluidScene || !this.flowScene || !this.fluidCamera
    ) return;

    const renderer = this.fluidRenderer;

    // Delta normalizado a 60fps
    const dt = this.lastFluidTime
      ? Math.min((timestamp - this.lastFluidTime) / 16.67, 3)
      : 1;
    this.lastFluidTime = timestamp;

    // 1) Cursor con easing: la "mano" sigue al ratón con inercia
    const pointerLerp = 1 - Math.pow(1 - FLUID.pointerEase, dt);
    this.lastSmoothPointer.copy(this.smoothPointer);
    this.smoothPointer.lerp(this.targetPointer, pointerLerp);

    const rawVelocity = this.pointerActive
      ? new THREE.Vector2().subVectors(this.smoothPointer, this.lastSmoothPointer)
      : new THREE.Vector2();

    // 2) Velocidad también suavizada (entra y sale despacio)
    const velocityLerp = 1 - Math.pow(1 - FLUID.velocityEase, dt);
    this.pointerVelocity.lerp(rawVelocity, velocityLerp);
    this.pointerVelocity.clampLength(0, FLUID.maxSpeed);

    // 3) Simulación del flujo (ping-pong)
    const [read, write] = this.flowTargets;

    const u = this.flowMaterial.uniforms;
    u['uPrev'].value = read.texture;
    u['uPointer'].value = this.smoothPointer;
    u['uVelocity'].value.copy(this.pointerVelocity).multiplyScalar(FLUID.gain);
    u['uDecay'].value = Math.pow(FLUID.decay, dt);

    renderer.setRenderTarget(write);
    renderer.render(this.flowScene, this.fluidCamera);
    renderer.setRenderTarget(null);

    this.flowTargets = [write, read];

    // 4) Render final
    this.fluidMaterial.uniforms['uTime'].value = timestamp * 0.001;
    this.fluidMaterial.uniforms['uFlow'].value = write.texture;

    renderer.render(this.fluidScene, this.fluidCamera);

    this.fluidAnimationFrame = requestAnimationFrame(this.animateFluidBackground);
  };

    private initializeThemeScroll(): void {
    const container = this.pageContainer?.nativeElement;

    if (!container || this.themeSections.length) return;

    this.themeSections = Array.from(
      container.querySelectorAll<HTMLElement>(':scope > section[data-theme]')
    );

    container.addEventListener('scroll', this.onPageScroll, { passive: true });

    this.updateTheme();
  }

  private onPageScroll = (): void => {
    if (this.themeFrame !== undefined) return;

    this.themeFrame = requestAnimationFrame(() => {
      this.themeFrame = undefined;
      this.updateTheme();
    });
  };

  private updateTheme(): void {
    const container = this.pageContainer?.nativeElement;

    if (!container || !this.themeSections.length) return;

    const rect = container.getBoundingClientRect();
    const line = rect.top + rect.height * this.themeLine;

    // La sección activa es la última cuyo borde superior ya cruzó la línea
    let active = this.themeSections[0];

    for (const section of this.themeSections) {
      if (section.getBoundingClientRect().top <= line) {
        active = section;
      }
    }

    const theme = active.dataset['theme'] ?? 'dark';

    if (container.dataset['theme'] !== theme) {
      container.dataset['theme'] = theme;
    }
  }

  scrollToTop(): void {
    this.pageContainer?.nativeElement.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  selectProject(id: string): void {
    const panel = this.documentsPanel?.nativeElement;
    const target = panel?.querySelector<HTMLElement>(`[id="${id}"]`);

    if (!panel || !target) return;

    // Marcamos la carpeta al instante y evitamos que el observer
    // la cambie mientras el panel se desplaza hasta el destino
    this.activeProject = id;
    this.lockProjectsObserver();

    panel.scrollTo({
      top: target.offsetTop,
      behavior: 'smooth'
    });
  }

  private lockProjectsObserver(): void {
    this.programmaticScroll = true;

    clearTimeout(this.scrollReleaseTimer);

    // Se libera cuando el panel deja de moverse
    this.scrollReleaseTimer = setTimeout(() => {
      this.programmaticScroll = false;
    }, 150);
  }

  private onProjectsScroll = (): void => {
    if (this.programmaticScroll) {
      this.lockProjectsObserver();
    }
  };

    private initializeFolderOutline(): void {
    const element = this.folder?.nativeElement;

    if (!element || this.folderResizeObserver) return;

    const update = (): void => {
      const w = element.clientWidth;
      const h = element.clientHeight;

      if (!w || !h) return;

      this.folderSize = { w, h };
      this.folderTabWidth = Math.min(FOLDER_SHAPE.tabWidth, w * 0.6);
      this.folderPath = this.buildFolderPath(w, h);
      this.folderFrontPath = this.buildFrontPath(w);

      this.cdr.detectChanges();
    };

    update();

    this.folderResizeObserver = new ResizeObserver(update);
    this.folderResizeObserver.observe(element);
  }

  // Contorno completo: pestaña arriba a la izquierda + cuerpo
  private buildFolderPath(w: number, h: number): string {
    const { tabHeight: T, tabRadius: tr, curve: c, radius: r } = FOLDER_SHAPE;
    const o = 1; // margen para que la línea no se recorte
    const tabWidth = Math.min(FOLDER_SHAPE.tabWidth, w * 0.6);
    const a = tabWidth - c;

    return [
      `M ${o} ${h - o - r}`,
      `V ${o + tr}`,
      `A ${tr} ${tr} 0 0 1 ${o + tr} ${o}`,           // esquina de la pestaña
      `H ${a}`,
      `C ${a + c * 0.55} ${o} ${a + c * 0.45} ${T} ${a + c} ${T}`, // bajada suave
      `H ${w - o - r}`,
      `A ${r} ${r} 0 0 1 ${w - o} ${T + r}`,           // esquina superior derecha
      `V ${h - o - r}`,
      `A ${r} ${r} 0 0 1 ${w - o - r} ${h - o}`,       // inferior derecha
      `H ${o + r}`,
      `A ${r} ${r} 0 0 1 ${o} ${h - o - r}`,           // inferior izquierda
      'Z'
    ].join(' ');
  }

  // Borde superior de la hoja frontal
  private buildFrontPath(w: number): string {
    const { tabHeight: T, frontGap: g, radius: r } = FOLDER_SHAPE;
    const o = 1;
    const f = T + g;

    return [
      `M ${o} ${f + r}`,
      `A ${r} ${r} 0 0 1 ${o + r} ${f}`,
      `H ${w - o - r}`,
      `A ${r} ${r} 0 0 1 ${w - o} ${f + r}`
    ].join(' ');
  }

  private initializeProjectsObserver(): void {
    const panel = this.documentsPanel?.nativeElement;

    if (!panel || this.projectsObserver) return;

    panel.addEventListener('scroll', this.onProjectsScroll, { passive: true });

    // Detecta qué proyecto cruza la línea central del panel
    this.projectsObserver = new IntersectionObserver(
      entries => {
        if (this.programmaticScroll) return;

        const visible = entries.find(entry => entry.isIntersecting);

        if (visible && visible.target.id !== this.activeProject) {
          this.activeProject = visible.target.id;
          this.cdr.detectChanges();
        }
      },
      {
        root: panel,
        rootMargin: '-50% 0px -50% 0px',
        threshold: 0
      }
    );

    panel.querySelectorAll('article').forEach(article => {
      this.projectsObserver!.observe(article);
    });
  }

  private initializeBubbles(): void {
    const area = this.bubbleArea?.nativeElement;

    if (!area) return;

    const width = area.clientWidth;
    const height = area.clientHeight;

    const columns = width > 420 ? 4 : 3;
    const rows = Math.ceil(this.skills.length / columns);

    const cellWidth = width / columns;
    const cellHeight = height / rows;

    this.skillBubbles = this.skills.map((name, index) => {
      const level = this.skillLevels[name] ?? 6;
      const size = 76 + (level - 6) * 10;

      const column = index % columns;
      const row = Math.floor(index / columns);

      return {
        name,
        size,
        x: column * cellWidth + (cellWidth - size) / 2,
        y: row * cellHeight + (cellHeight - size) / 2,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5
      };
    });
  }

  onTechnologyPointerMove(event: PointerEvent): void {
    const section = event.currentTarget as HTMLElement;
    const rect = section.getBoundingClientRect();

    const x = (event.clientX - rect.left) / rect.width;
    const y = 1 - (event.clientY - rect.top) / rect.height;

    this.targetPointer.set(x, y);

    // Primera vez: colocar la mano sin generar un salto brusco
    if (!this.pointerInitialized) {
      this.smoothPointer.copy(this.targetPointer);
      this.lastSmoothPointer.copy(this.targetPointer);
      this.pointerInitialized = true;
    }

    this.pointerActive = true;
  }

  onTechnologyPointerLeave(): void {
    this.pointerActive = false;
    this.pointerInitialized = false; // al volver a entrar, no hay "arrastre" desde el borde
  }

  private animateBubbles = (timestamp = 0): void => {
    const area = this.bubbleArea?.nativeElement;

    if (!area || !this.showBubbles) return;

    const width = area.clientWidth;
    const height = area.clientHeight;

    const delta = this.lastBubbleFrame
      ? Math.min((timestamp - this.lastBubbleFrame) / 16.67, 2)
      : 1;

    this.lastBubbleFrame = timestamp;

    const bubbles = this.skillBubbles;

    // Movimiento
    for (const bubble of bubbles) {
      if (this.bubbleMouse.active) {
        const centerX = bubble.x + bubble.size / 2;
        const centerY = bubble.y + bubble.size / 2;

        const dx = centerX - this.bubbleMouse.x;
        const dy = centerY - this.bubbleMouse.y;

        const distance = Math.sqrt(dx * dx + dy * dy);

        const influenceRadius = 130;

        if (distance < influenceRadius && distance > 0) {

          const force = (1 - distance / influenceRadius) * 0.45;

          bubble.vx += (dx / distance) * force * delta;
          bubble.vy += (dy / distance) * force * delta;
        }
      }

      // Limitar velocidad máxima
      const maxSpeed = 1.5;
      const speed = Math.sqrt(
        bubble.vx * bubble.vx + bubble.vy * bubble.vy
      );

      if (speed > maxSpeed) {
        bubble.vx = (bubble.vx / speed) * maxSpeed;
        bubble.vy = (bubble.vy / speed) * maxSpeed;
      }

      // Movimiento normal
      bubble.x += bubble.vx * delta;
      bubble.y += bubble.vy * delta;

      const maxX = width - bubble.size;
      const maxY = height - bubble.size;

      // Límites horizontales
      if (bubble.x <= 0) {
        bubble.x = 0;
        bubble.vx = Math.abs(bubble.vx);
      } else if (bubble.x >= maxX) {
        bubble.x = maxX;
        bubble.vx = -Math.abs(bubble.vx);
      }

      // Límites verticales
      if (bubble.y <= 0) {
        bubble.y = 0;
        bubble.vy = Math.abs(bubble.vy);
      } else if (bubble.y >= maxY) {
        bubble.y = maxY;
        bubble.vy = -Math.abs(bubble.vy);
      }
    }

    // Colisiones entre burbujas
    for (let i = 0; i < bubbles.length; i++) {
      for (let j = i + 1; j < bubbles.length; j++) {
        const a = bubbles[i];
        const b = bubbles[j];

        const radiusA = a.size / 2;
        const radiusB = b.size / 2;

        const centerAX = a.x + radiusA;
        const centerAY = a.y + radiusA;

        const centerBX = b.x + radiusB;
        const centerBY = b.y + radiusB;

        const dx = centerBX - centerAX;
        const dy = centerBY - centerAY;

        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = radiusA + radiusB;

        if (distance < minDistance && distance > 0) {
          const nx = dx / distance;
          const ny = dy / distance;

          // Separar las burbujas para evitar que se superpongan
          const overlap = minDistance - distance;

          a.x -= nx * overlap / 2;
          a.y -= ny * overlap / 2;

          b.x += nx * overlap / 2;
          b.y += ny * overlap / 2;

          // Intercambio de velocidad en la dirección de colisión
          const relativeVelocity =
            (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;

          if (relativeVelocity < 0) {
            a.vx += relativeVelocity * nx;
            a.vy += relativeVelocity * ny;

            b.vx -= relativeVelocity * nx;
            b.vy -= relativeVelocity * ny;
          }
        }
      }
    }

    this.cdr.detectChanges();

    this.bubbleAnimationFrame = requestAnimationFrame(this.animateBubbles);
  };

  onBubbleMouseMove(event: MouseEvent): void {
    const area = this.bubbleArea?.nativeElement;
    if (!area) return;

    const rect = area.getBoundingClientRect();

    this.bubbleMouse.x = event.clientX - rect.left;
    this.bubbleMouse.y = event.clientY - rect.top;
    this.bubbleMouse.active = true;
  }

  onBubbleMouseLeave(): void {
    this.bubbleMouse.active = false;
  }
}