
import { Component, OnDestroy, ChangeDetectorRef,  ElementRef, ViewChild } from '@angular/core';
import { Preloader } from './components/preloader/preloader';

interface SkillBubble {
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
}

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

  private bubbleMouse = {
    x: 0,
    y: 0,
    active: false
  };

  showBubbles = false;

  skillBubbles: SkillBubble[] = [];

  @ViewChild('bubbleArea')
  bubbleArea?: ElementRef<HTMLDivElement>;

  private bubbleAnimationFrame?: number;
  private lastBubbleFrame = 0;

  isLoading: boolean = true;

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
    this.startTechnologyCycle();
  }

  private startTechnologyCycle(): void {
    if (this.started || this.destroyed) return;

    this.started = true;
    this.runTechnologyCycle();
  }

  private runTechnologyCycle(): void {
    if (this.destroyed) return;

    // Mantener las tecnologías durante 7 segundos
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

      // Mantener el nuevo grupo durante otros 7 segundos
      this.runTechnologyCycle();

    }, 3000);
  }

  ngOnDestroy(): void {
    this.destroyed = true;

    if (this.cycleTimer) {
      clearTimeout(this.cycleTimer);
    }
    if (this.lensAnimationFrame !== undefined) {
    cancelAnimationFrame(this.lensAnimationFrame);
  }

    this.letterTimers.forEach(timer => clearTimeout(timer));
    this.letterTimers = [];
  }

  mouseX = 50;
  mouseY = 50;

  lensX = 50;
  lensY = 50;

  mouseActive = false;

  private lensAnimationFrame?: number;

  onTechnologyPointerMove(event: PointerEvent): void {
    const section = event.currentTarget as HTMLElement;
    const rect = section.getBoundingClientRect();

    // Posición objetivo del cursor
    this.mouseX = ((event.clientX - rect.left) / rect.width) * 100;
    this.mouseY = ((event.clientY - rect.top) / rect.height) * 100;

    this.mouseActive = true;

    // Inicia la animación si todavía no está ejecutándose
    if (this.lensAnimationFrame === undefined) {
      this.animateLens();
    }
  }

  private animateLens = (): void => {

    const easing = 0.075;

    const distanceX = this.mouseX - this.lensX;
    const distanceY = this.mouseY - this.lensY;

    this.lensX += distanceX * easing;
    this.lensY += distanceY * easing;

    // Evita detenerse bruscamente al alcanzar el cursor
    if (Math.abs(distanceX) < 0.01 && Math.abs(distanceY) < 0.01) {
      this.lensX = this.mouseX;
      this.lensY = this.mouseY;

      this.lensAnimationFrame = undefined;
      this.cdr.detectChanges();

      return;
    }

    this.cdr.detectChanges();

    this.lensAnimationFrame = requestAnimationFrame(this.animateLens);
  };

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
