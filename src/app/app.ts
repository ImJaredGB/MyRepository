
import { Component, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Preloader } from './components/preloader/preloader';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [Preloader],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnDestroy {
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
}
