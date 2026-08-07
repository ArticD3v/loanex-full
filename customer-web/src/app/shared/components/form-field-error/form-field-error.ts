import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  signal,
} from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { merge } from 'rxjs';

@Component({
  selector: 'app-form-field-error',
  templateUrl: './form-field-error.html',
  styleUrl: './form-field-error.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormFieldErrorComponent {
  readonly control = input<AbstractControl | null>(null);
  readonly label = input('This field');
  /** Increment from parent after markAllAsTouched() so errors refresh on submit. */
  readonly submitted = input(0);

  readonly message = signal<string | null>(null);

  constructor() {
    effect((onCleanup) => {
      const ctrl = this.control();
      // Depend on submitted so submit attempts re-evaluate messages.
      this.submitted();
      this.message.set(this.resolveMessage(ctrl));

      if (!ctrl) {
        return;
      }

      const sub = merge(ctrl.valueChanges, ctrl.statusChanges).subscribe(() => {
        this.message.set(this.resolveMessage(ctrl));
      });

      onCleanup(() => sub.unsubscribe());
    });
  }

  private resolveMessage(ctrl: AbstractControl | null): string | null {
    if (!ctrl || !(ctrl.touched || ctrl.dirty) || !ctrl.errors) {
      return null;
    }

    const errors = ctrl.errors;
    if (errors['required']) return `${this.label()} is required`;
    if (errors['email']) return 'Enter a valid email address';
    if (errors['indianMobile']) return 'Enter a valid 10-digit mobile number';
    if (errors['otp']) return 'Enter a valid 6-digit OTP';
    if (errors['minlength']) {
      return `${this.label()} must be at least ${errors['minlength'].requiredLength} characters`;
    }
    if (errors['strongPassword']) {
      return 'Use 8+ chars with upper, lower, and a number';
    }
    if (errors['fieldsMismatch']) return 'Passwords do not match';

    return 'Invalid value';
  }
}
