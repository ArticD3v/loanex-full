import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { FormFieldErrorComponent } from '../../../../shared/components/form-field-error/form-field-error';
import {
  indianMobileValidator,
  matchFieldsValidator,
  otpCodeValidator,
  strongPasswordValidator,
} from '../../../../shared/validators/auth.validators';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink, FormFieldErrorComponent],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPassword {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = this.auth.loading;
  readonly error = this.auth.error;
  readonly success = signal<string | null>(null);
  readonly showPassword = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      mobile: ['', [Validators.required, indianMobileValidator()]],
      otp: ['', [Validators.required, otpCodeValidator()]],
      newPassword: ['', [Validators.required, strongPasswordValidator()]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: matchFieldsValidator('newPassword', 'confirmPassword') },
  );

  constructor() {
    const mobile = this.route.snapshot.queryParamMap.get('mobile') ?? '';
    const otp = this.route.snapshot.queryParamMap.get('otp') ?? '';
    this.form.patchValue({ mobile, otp });
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  submit(): void {
    this.auth.clearError();
    this.success.set(null);
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const { mobile, otp, newPassword } = this.form.getRawValue();
    this.auth.resetPassword({ mobile, otp, newPassword }).subscribe({
      next: (res) => {
        this.success.set(res.message);
        setTimeout(() => void this.router.navigateByUrl('/auth/login'), 1200);
      },
    });
  }
}
