import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { FormFieldErrorComponent } from '../../../../shared/components/form-field-error/form-field-error';
import { indianMobileValidator } from '../../../../shared/validators/auth.validators';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, FormFieldErrorComponent],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly loading = this.auth.loading;
  readonly error = this.auth.error;
  readonly showPassword = signal(false);

  readonly form = this.fb.nonNullable.group({
    mobile: ['', [Validators.required, indianMobileValidator()]],
    password: ['', [Validators.required, Validators.minLength(1)]],
  });

  constructor() {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    this.auth.setReturnUrl(returnUrl);
  }

  get routeReturnParams(): Record<string, string> {
    const returnUrl = this.auth.getReturnUrl();
    return returnUrl && returnUrl !== '/' ? { returnUrl } : {};
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
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

    const { mobile, password } = this.form.getRawValue();
    // Password login only — OTP login is disabled on the API.
    this.auth.login({ identifier: mobile.trim(), password }).subscribe({
      next: () => {
        this.auth.redirectAfterAuth();
      },
    });
  }
}
