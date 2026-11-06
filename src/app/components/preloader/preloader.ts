
import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  Output,
  EventEmitter
} from '@angular/core';

const HOLD_AT_100 = 300;     // se queda un instante mostrando 100%
const LEAVE_TO_OPEN = 500;   // desde que el texto se va hasta que empieza a abrirse
const OPEN_DURATION = 1300;

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

  private counter?: ReturnType<typeof setInterval>;
  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // Contador simulado. Si tu carga es real, sustitúyelo por tu lógica
    // y llama a this.finish() cuando llegue a 100.
    this.counter = setInterval(() => {
      this.progress = Math.min(
        100,
        this.progress + 1 + Math.floor(Math.random() * 4)
      );
      this.cdr.markForCheck();

      if (this.progress === 100) {
        clearInterval(this.counter);
        this.finish();
      }
    }, 60);
  }

  private finish(): void {
    this.schedule(() => {
      // 1) El texto se va y la página principal se monta debajo
      this.isLeaving = true;
      this.cdr.markForCheck();
      this.loadingComplete.emit();

      this.schedule(() => {
        // 2) El cuadrado empieza a abrirse
        this.isOpening = true;
        this.cdr.markForCheck();
        this.revealStart.emit();

        // 3) Cuando termina, se avisa para quitar el preloader
        this.schedule(() => this.revealEnd.emit(), OPEN_DURATION + 60);
      }, LEAVE_TO_OPEN);
    }, HOLD_AT_100);
  }

  private schedule(fn: () => void, delay: number): void {
    this.timers.push(setTimeout(fn, delay));
  }

  ngOnDestroy(): void {
    clearInterval(this.counter);
    this.timers.forEach(timer => clearTimeout(timer));
  }
}