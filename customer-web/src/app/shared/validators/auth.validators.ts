import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function indianMobileValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    if (!value) {
      return null;
    }
    return /^[6-9]\d{9}$/.test(value) ? null : { indianMobile: true };
  };
}

export function strongPasswordValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '');
    if (!value) {
      return null;
    }

    const errors: ValidationErrors = {};
    if (value.length < 8) errors['minLength'] = true;
    if (!/[A-Z]/.test(value)) errors['uppercase'] = true;
    if (!/[a-z]/.test(value)) errors['lowercase'] = true;
    if (!/[0-9]/.test(value)) errors['number'] = true;

    return Object.keys(errors).length ? { strongPassword: errors } : null;
  };
}

export function matchFieldsValidator(source: string, target: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const a = group.get(source)?.value;
    const b = group.get(target)?.value;
    if (a == null || b == null || a === '') {
      return null;
    }
    return a === b ? null : { fieldsMismatch: true };
  };
}

export function otpCodeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    if (!value) {
      return null;
    }
    return /^\d{6}$/.test(value) ? null : { otp: true };
  };
}
