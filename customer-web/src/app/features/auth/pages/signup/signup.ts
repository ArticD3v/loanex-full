import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { FormFieldErrorComponent } from '../../../../shared/components/form-field-error/form-field-error';
import { indianMobileValidator } from '../../../../shared/validators/auth.validators';
import { OtpVerificationDialogComponent } from '../../components/otp-verification-dialog/otp-verification-dialog';

@Component({
  selector: 'app-signup',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    FormFieldErrorComponent,
    OtpVerificationDialogComponent,
  ],
  templateUrl: './signup.html',
  styleUrl: './signup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Signup {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = this.auth.loading;
  readonly error = this.auth.error;
  readonly otpOpen = signal(false);
  readonly otpMobile = signal('');
  readonly otpError = signal<string | null>(null);
  readonly otpChallenge = signal<string | null>(null);
  readonly cooldownSeconds = signal(30);

  readonly form = this.fb.nonNullable.group({
    mobile: ['', [Validators.required, indianMobileValidator()]],
  });

  constructor() {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    this.auth.setReturnUrl(returnUrl);
  }

  get routeReturnParams(): Record<string, string> {
    const returnUrl = this.auth.getReturnUrl();
    return returnUrl && returnUrl !== '/' ? { returnUrl } : {};
  }

  onMobileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '').slice(0, 10);
    this.form.controls.mobile.setValue(value);
    input.value = value;
  }

  submit(): void {
    this.auth.clearError();
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const mobile = this.form.controls.mobile.value.trim();
    this.otpMobile.set(mobile);
    this.otpError.set(null);
    this.otpChallenge.set(null);

    this.auth.sendOtp({ mobile, purpose: 'REGISTER' }).subscribe({
      next: (res) => {
        this.otpChallenge.set(res.otpChallenge ?? null);
        this.cooldownSeconds.set(res.resendAvailableIn ?? 30);
        this.otpOpen.set(true);
      },
    });
  }

  onOtpVerified(otp: string): void {
    this.otpError.set(null);
    const challenge = this.otpChallenge();
    this.auth
      .verifyOtp({
        mobile: this.otpMobile(),
        otp,
        purpose: 'REGISTER',
        ...(challenge ? { otpChallenge: challenge } : {}),
      })
      .subscribe({
        next: (data) => {
          this.otpOpen.set(false);
          if (data.requiresProfile && data.registrationToken) {
            void this.router.navigate(['/auth/complete-profile'], {
              queryParams: {
                token: data.registrationToken,
                mobile: data.mobile ?? this.otpMobile(),
                ...this.routeReturnParams,
              },
            });
            return;
          }
          this.auth.redirectAfterAuth();
        },
        error: (err: {
          error?: { message?: string; details?: { otpChallenge?: string } };
        }) => {
          const nextChallenge = err?.error?.details?.otpChallenge;
          if (nextChallenge) {
            this.otpChallenge.set(nextChallenge);
          }
          this.otpError.set(err?.error?.message ?? 'OTP verification failed');
        },
      });
  }

  onResendOtp(): void {
    this.otpError.set(null);
    const challenge = this.otpChallenge();
    this.auth
      .sendOtp({
        mobile: this.otpMobile(),
        purpose: 'REGISTER',
        ...(challenge ? { otpChallenge: challenge } : {}),
      })
      .subscribe({
        next: (res) => {
          this.otpChallenge.set(res.otpChallenge ?? null);
          this.cooldownSeconds.set(res.resendAvailableIn ?? 30);
        },
        error: (err: { error?: { message?: string } }) => {
          this.otpError.set(err?.error?.message ?? 'Unable to resend OTP');
        },
      });
  }
}
