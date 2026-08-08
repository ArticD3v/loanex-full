import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FormFieldErrorComponent } from '../../../../shared/components/form-field-error/form-field-error';
import { indianMobileValidator } from '../../../../shared/validators/auth.validators';
import {
  PREFERRED_DEPARTMENTS,
  PreferredDepartment,
} from '../../models/careers.models';
import { CareersService } from '../../services/careers.service';

const MAX_RESUME_BYTES = 5 * 1024 * 1024;
const ALLOWED_RESUME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

@Component({
  selector: 'app-general-application',
  imports: [ReactiveFormsModule, RouterLink, FormFieldErrorComponent],
  templateUrl: './general-application.html',
  styleUrl: './general-application.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GeneralApplicationComponent {
  private readonly fb = inject(FormBuilder);
  private readonly careers = inject(CareersService);

  readonly departments = PREFERRED_DEPARTMENTS;
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal(false);
  readonly resumeFile = signal<File | null>(null);
  readonly resumeName = signal<string | null>(null);
  readonly resumeError = signal<string | null>(null);
  readonly submittedTick = signal(0);

  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, indianMobileValidator()]],
    location: ['', [Validators.maxLength(120)]],
    experience: ['', [Validators.maxLength(80)]],
    currentJobTitle: ['', [Validators.maxLength(120)]],
    skills: ['', [Validators.maxLength(500)]],
    preferredDepartment: ['' as PreferredDepartment | '', Validators.required],
    linkedinUrl: ['', [Validators.maxLength(300)]],
    portfolioUrl: ['', [Validators.maxLength(300)]],
    about: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(4000)]],
  });

  onResumeSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.resumeError.set(null);

    if (!file) {
      this.resumeFile.set(null);
      this.resumeName.set(null);
      return;
    }

    if (file.size > MAX_RESUME_BYTES) {
      this.resumeError.set('Resume must be 5MB or smaller.');
      input.value = '';
      this.resumeFile.set(null);
      this.resumeName.set(null);
      return;
    }

    const typeOk =
      ALLOWED_RESUME_TYPES.includes(file.type) || /\.(pdf|doc|docx)$/i.test(file.name);
    if (!typeOk) {
      this.resumeError.set('Upload a PDF or Word document (.pdf, .doc, .docx).');
      input.value = '';
      this.resumeFile.set(null);
      this.resumeName.set(null);
      return;
    }

    this.resumeFile.set(file);
    this.resumeName.set(file.name);
  }

  submit(): void {
    this.error.set(null);

    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      this.submittedTick.update((n) => n + 1);
      if (!this.resumeFile()) this.resumeError.set('Resume is required');
      return;
    }

    const resume = this.resumeFile();
    if (!resume) {
      this.resumeError.set('Resume is required');
      this.submittedTick.update((n) => n + 1);
      return;
    }

    const value = this.form.getRawValue();
    const optionalUrl = (url: string) => {
      const trimmed = url.trim();
      if (!trimmed) return undefined;
      if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
      return trimmed;
    };

    this.submitting.set(true);
    this.careers
      .submitGeneralApplication({
        fullName: value.fullName.trim(),
        email: value.email.trim(),
        phone: value.phone.trim(),
        location: value.location.trim(),
        experience: value.experience.trim(),
        currentJobTitle: value.currentJobTitle.trim(),
        skills: value.skills.trim(),
        preferredDepartment: value.preferredDepartment as PreferredDepartment,
        about: value.about.trim(),
        resume,
        linkedinUrl: optionalUrl(value.linkedinUrl),
        portfolioUrl: optionalUrl(value.portfolioUrl),
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.success.set(true);
          if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        },
        error: () => {
          this.submitting.set(false);
          this.error.set(
            this.careers.error() ?? 'Unable to submit your application. Please try again.',
          );
        },
      });
  }
}
