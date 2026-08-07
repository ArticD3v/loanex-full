import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { FormFieldErrorComponent } from '../../../../shared/components/form-field-error/form-field-error';
import {
  matchFieldsValidator,
  strongPasswordValidator,
} from '../../../../shared/validators/auth.validators';

@Component({
  selector: 'app-complete-profile',
  imports: [ReactiveFormsModule, RouterLink, FormFieldErrorComponent],
  templateUrl: './complete-profile.html',
  styleUrl: './complete-profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompleteProfile {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = this.auth.loading;
  readonly error = this.auth.error;
  readonly showPassword = signal(false);
  readonly formError = signal<string | null>(null);
  readonly submitted = signal(0);
  readonly mobile = signal('');
  private registrationToken = '';

  readonly form = this.fb.nonNullable.group(
    {
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, strongPasswordValidator()]],
      confirmPassword: ['', [Validators.required]],
      dob: [''],
      gender: ['' as '' | 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY'],
    },
    { validators: matchFieldsValidator('password', 'confirmPassword') },
  );

  constructor() {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    this.auth.setReturnUrl(returnUrl);

    this.registrationToken = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.mobile.set(this.route.snapshot.queryParamMap.get('mobile') ?? '');

    if (!this.registrationToken) {
      void this.router.navigate(['/auth/signup'], {
        queryParams: returnUrl ? { returnUrl } : undefined,
      });
    }
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  isInvalid(
    name: 'fullName' | 'email' | 'password' | 'confirmPassword' | 'dob' | 'gender',
  ): boolean {
    const ctrl = this.form.controls[name];
    return ctrl.invalid && (ctrl.touched || ctrl.dirty || this.submitted() > 0);
  }

  submit(): void {
    this.auth.clearError();
    this.formError.set(null);
    this.form.markAllAsTouched();
    this.form.updateValueAndValidity();
    this.submitted.update((n) => n + 1);

    if (this.form.invalid) {
      this.formError.set(
        this.form.hasError('fieldsMismatch')
          ? 'Passwords do not match.'
          : 'Please fix the highlighted fields. Password needs 8+ characters with upper, lower, and a number.',
      );
      return;
    }

    const { fullName, email, password, dob, gender } = this.form.getRawValue();
    this.auth
      .completeRegistration({
        registrationToken: this.registrationToken,
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        ...(dob ? { dob } : {}),
        ...(gender ? { gender } : {}),
      })
      .subscribe({
        next: () => this.auth.redirectAfterAuth(),
      });
  }
}
