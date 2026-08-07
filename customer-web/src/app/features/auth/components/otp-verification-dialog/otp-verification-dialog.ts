import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  QueryList,
  ViewChildren,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { Dialog } from 'primeng/dialog';

@Component({
  selector: 'app-otp-verification-dialog',
  imports: [Dialog],
  templateUrl: './otp-verification-dialog.html',
  styleUrl: './otp-verification-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtpVerificationDialogComponent implements OnDestroy {
  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  readonly visible = input(false);
  readonly mobile = input('');
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly title = input('Verify OTP');
  readonly countdownSeconds = input(0);
  readonly success = input(false);
  readonly successMessage = input('Mobile verified successfully');
  readonly length = input(6);
  readonly autoSubmit = input(true);
  readonly visibleChange = output<boolean>();
  readonly verified = output<string>();
  readonly resend = output<void>();

  readonly digits = signal<string[]>(['', '', '', '', '', '']);
  readonly secondsLeft = signal(0);

  private timerId: ReturnType<typeof setInterval> | null = null;

  readonly otpComplete = computed(() => this.digits().length === this.length() && this.digits().every((d) => d.length === 1));
  readonly canResend = computed(() => this.secondsLeft() <= 0);
  readonly displayMobile = computed(() => this.formatMobile(this.mobile()));
  readonly timerLabel = computed(() => {
    const total = this.secondsLeft();
    const mins = Math.floor(total / 60)
      .toString()
      .padStart(2, '0');
    const secs = (total % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  });

  constructor() {
    effect(() => {
      if (this.visible()) {
        const len = this.length();
        this.digits.set(Array.from({ length: len }, () => ''));
        const seconds = this.countdownSeconds() > 0 ? this.countdownSeconds() : 30;
        this.startCountdown(seconds);
        queueMicrotask(() => this.otpInputs?.first?.nativeElement?.focus());
      } else {
        this.clearCountdown();
      }
    });
  }

  ngOnDestroy(): void {
    this.clearCountdown();
  }

  onVisibleChange(value: boolean): void {
    this.visibleChange.emit(value);
  }

  onInput(index: number, event: Event): void {
    if (this.success()) return;

    const inputEl = event.target as HTMLInputElement;
    const value = inputEl.value.replace(/\D/g, '').slice(-1);
    const next = [...this.digits()];
    next[index] = value;
    this.digits.set(next);
    inputEl.value = value;

    if (value && index < this.length() - 1) {
      this.otpInputs.get(index + 1)?.nativeElement.focus();
    }

    if (next.every((d) => d.length === 1)) {
      this.submit();
    }
  }

  onKeydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.digits()[index] && index > 0) {
      this.otpInputs.get(index - 1)?.nativeElement.focus();
    }
  }

  onPaste(event: ClipboardEvent): void {
    if (this.success()) return;

    event.preventDefault();
    const len = this.length();
    const text = event.clipboardData?.getData('text')?.replace(/\D/g, '').slice(0, len) ?? '';
    if (!text) return;

    const next = Array.from({ length: len }, (_, i) => text[i] ?? '');
    this.digits.set(next);

    const focusIndex = Math.min(text.length, len - 1);
    this.otpInputs.get(focusIndex)?.nativeElement.focus();

    if (text.length === len) {
      this.submit();
    }
  }

  submit(): void {
    const code = this.digits().join('');
    if (code.length !== this.length() || this.loading() || this.success()) {
      return;
    }
    this.verified.emit(code);
  }

  onResend(): void {
    if (this.loading() || this.success() || !this.canResend()) return;
    this.digits.set(Array.from({ length: this.length() }, () => ''));
    const seconds = this.countdownSeconds() > 0 ? this.countdownSeconds() : 30;
    this.startCountdown(seconds);
    this.resend.emit();
    queueMicrotask(() => this.otpInputs?.first?.nativeElement?.focus());
  }

  private formatMobile(value: string): string {
    const digits = value.replace(/\D/g, '').slice(-10);
    if (digits.length !== 10) {
      return value.trim() || '—';
    }
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }

  private startCountdown(seconds: number): void {
    this.clearCountdown();
    this.secondsLeft.set(Math.max(0, seconds));
    if (seconds <= 0) return;

    this.timerId = setInterval(() => {
      const next = this.secondsLeft() - 1;
      if (next <= 0) {
        this.secondsLeft.set(0);
        this.clearCountdown();
        return;
      }
      this.secondsLeft.set(next);
    }, 1000);
  }

  private clearCountdown(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}
