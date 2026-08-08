import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { FormFieldErrorComponent } from '../../../../shared/components/form-field-error/form-field-error';

/** Accept Indian mobile (10 digits starting 6-9) or a basic email. */
function loginIdentifierValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  if (!value) return null;
  if (/^[6-9]\d{9}$/.test(value)) return null;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return null;
  return { loginIdentifier: true };
}

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
    identifier: ['', [Validators.required, loginIdentifierValidator]],
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

  onIdentifierInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.trim();
    // Digits-only → treat as mobile and cap at 10.
    if (/^\d+$/.test(value)) {
      value = value.replace(/\D/g, '').slice(0, 10);
    }
    this.form.controls.identifier.setValue(value);
    input.value = value;
  }

  submit(): void {
    this.auth.clearError();
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const { identifier, password } = this.form.getRawValue();
    // Password login only — OTP login is disabled on the API.
    this.auth.login({ identifier: identifier.trim(), password }).subscribe({
      next: (data) => {
        if (data.requiresOtp || !data.accessToken || !data.user) {
          // Session not established — do not navigate away.
          return;
        }
        this.auth.redirectAfterAuth();
      },
    });
  }
}
