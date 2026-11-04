
import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  Output,
  EventEmitter
} from '@angular/core';

@Component({
  selector: 'app-preloader',
  standalone: true,
  imports: [],
  templateUrl: './preloader.html',
  styleUrl: './preloader.scss'
})
export class Preloader implements OnInit, OnDestroy {

  @Output() loadingComplete = new EventEmitter<void>();

  progress: number = 0;
  isFadingOut: boolean = false;

  private intervalId: ReturnType<typeof setInterval> | undefined;
  private fadeTimeout: ReturnType<typeof setTimeout> | undefined;

  constructor(private cdr: ChangeDetectorRef) {}


  ngOnInit(): void {
    const updateProgress = () => {
      if (this.progress < 100) {
        this.progress++;
        this.cdr.detectChanges();

        const delay = this.progress >= 97 ? 200 : 20;

        this.intervalId = setTimeout(updateProgress, delay);
      } else {
        this.stopLoading();
      }
    };

    this.intervalId = setTimeout(updateProgress, 20);
  }


  stopLoading(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.isFadingOut = true;
    this.cdr.detectChanges();

    this.fadeTimeout = setTimeout(() => {
      this.loadingComplete.emit();
    }, 800);
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    if (this.fadeTimeout) {
      clearTimeout(this.fadeTimeout);
    }
  }
}
