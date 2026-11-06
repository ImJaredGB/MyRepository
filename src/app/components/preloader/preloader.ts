import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output
} from '@angular/core';

// Tamaño mínimo para ver la página.
// Debe coincidir con $min-width y $min-height de app.scss
const MIN_WIDTH = 1280;
const MIN_HEIGHT = 640;

// Tiempos en ms. OPEN_DURATION debe coincidir con $open-duration de preloader.scss
const TICK = 60;
const HOLD_AT_100 = 300;     // se queda un instante mostrando 100%
const LEAVE_TO_OPEN = 500;   // desde que el texto se va hasta que empieza a abrirse
const OPEN_DURATION = 1300;

type Phase = 'counting' | 'holding' | 'leaving' | 'opening' | 'done';

@Component({
  selector: 'app-preloader',
  standalone: true,
  templateUrl: './preloader.html',
  styleUrl: './preloader.scss'
})
export class Preloader implements OnInit, OnDestroy {

  // La carga terminó: la página principal ya puede montarse debajo
  @Output() loadingComplete = new EventEmitter<void>();

  // El cuadrado empieza a abrirse
  @Output() revealStart = new EventEmitter<void>();

  // El cuadrado terminó de abrirse: se puede quitar el preloader
  @Output() revealEnd = new EventEmitter<void>();

  progress = 0;
  isLeaving = false;
  isOpening = false;

  private phase: Phase = 'counting';
  private phaseElapsed = 0;
  private ticker?: ReturnType<typeof setInterval>;

  // ¿La pantalla es lo bastante grande para mostrar la experiencia?
  private readonly screenQuery = window.matchMedia(
    `(min-width: ${MIN_WIDTH}px) and (min-height: ${MIN_HEIGHT}px)`
  );

  private canRun = this.screenQuery.matches;

  private onScreenChange = (event: MediaQueryListEvent): void => {
    this.canRun = event.matches;
  };

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.screenQuery.addEventListener('change', this.onScreenChange);

    // Un único reloj lleva toda la secuencia. Si la pantalla es pequeña,
    // no avanza nada hasta que vuelva a ser grande.
    this.ticker = setInterval(() => this.tick(), TICK);
  }

  private tick(): void {
    // Una vez que el cuadrado empezó a abrirse, la apertura termina sola
    if (!this.canRun && this.phase !== 'opening') return;

    switch (this.phase) {

      case 'counting':
        // Contador simulado. Si tu carga es real, sustitúyelo por tu lógica
        // y pasa a 'holding' cuando llegue a 100.
        this.progress = Math.min(
          100,
          this.progress + 1 + Math.floor(Math.random() * 4)
        );

        if (this.progress === 100) {
          this.goTo('holding');
        }
        break;

      case 'holding':
        this.wait(HOLD_AT_100, () => {
          // El texto se va y la página principal se monta debajo
          this.isLeaving = true;
          this.loadingComplete.emit();
          this.goTo('leaving');
        });
        break;

      case 'leaving':
        this.wait(LEAVE_TO_OPEN, () => {
          // El cuadrado empieza a abrirse
          this.isOpening = true;
          this.revealStart.emit();
          this.goTo('opening');
        });
        break;

      case 'opening':
        this.wait(OPEN_DURATION + 60, () => {
          this.revealEnd.emit();
          this.goTo('done');
          clearInterval(this.ticker);
        });
        break;
    }

    this.cdr.markForCheck();
  }

  private goTo(phase: Phase): void {
    this.phase = phase;
    this.phaseElapsed = 0;
  }

  // Cuenta tiempo solo mientras la pantalla es grande
  private wait(duration: number, next: () => void): void {
    this.phaseElapsed += TICK;

    if (this.phaseElapsed >= duration) {
      next();
    }
  }

  ngOnDestroy(): void {
    clearInterval(this.ticker);
    this.screenQuery.removeEventListener('change', this.onScreenChange);
  }
}