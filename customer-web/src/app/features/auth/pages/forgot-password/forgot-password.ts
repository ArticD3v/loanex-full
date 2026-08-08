import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { FormFieldErrorComponent } from '../../../../shared/components/form-field-error/form-field-error';
import { indianMobileValidator } from '../../../../shared/validators/auth.validators';
import { OtpVerificationDialogComponent } from '../../components/otp-verification-dialog/otp-verification-dialog';
import { PasswordResetSessionService } from '../../services/password-reset-session.service';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink, FormFieldErrorComponent, OtpVerificationDialogComponent],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPassword {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly resetSession = inject(PasswordResetSessionService);

  readonly loading = this.auth.loading;
  readonly error = this.auth.error;
  readonly otpOpen = signal(false);
  readonly otpError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    mobile: ['', [Validators.required, indianMobileValidator()]],
  });

  submit(): void {
    this.auth.clearError();
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const { mobile } = this.form.getRawValue();
    this.auth.forgotPassword({ mobile }).subscribe({
      next: () => {
        this.otpOpen.set(true);
      },
    });
  }

  onOtpVerified(otp: string): void {
    const mobile = this.form.controls.mobile.value;
    this.otpOpen.set(false);
    this.resetSession.set(mobile, otp);
    void this.router.navigate(['/auth/reset-password'], {
      queryParams: { mobile },
    });
  }

  onResendOtp(): void {
    this.otpError.set(null);
    const mobile = this.form.controls.mobile.value;
    this.auth.forgotPassword({ mobile }).subscribe({
      next: () => undefined,
      error: (err: { error?: { message?: string } }) => {
        this.otpError.set(err?.error?.message ?? 'Unable to resend OTP');
      },
    });
  }
}
