import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { VerificationService } from '../../services/verification.service';

@Component({
  selector: 'app-pan-verification',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './pan-verification.html',
  styleUrl: './pan-verification.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanVerificationComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly verification = inject(VerificationService);
  private readonly router = inject(Router);

  readonly pageError = signal<string | null>(null);
  readonly verifying = signal(false);
  readonly verified = signal(false);
  readonly maskedPan = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    panNumber: ['', [Validators.required, Validators.pattern(/^[A-Z]{5}[0-9]{4}[A-Z]$/)]],
    fullName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    dateOfBirth: ['', [Validators.required]],
  });

  readonly todayMax = (() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  })();

  readonly steps = [
    { key: 'mobile', label: 'Mobile Verified', index: 1 },
    { key: 'aadhaar', label: 'Aadhaar', index: 2 },
    { key: 'pan', label: 'PAN', index: 3 },
    { key: 'bank', label: 'Bank Account', index: 4 },
    { key: 'complete', label: 'Complete', index: 5 },
  ] as const;

  ngOnInit(): void {
    this.verification.getPanStatus().subscribe({
      next: (status) => {
        if (!status.aadhaarVerified) {
          void this.router.navigateByUrl('/verification');
          return;
        }

        if (status.panVerified) {
          this.verified.set(true);
          this.maskedPan.set(status.panNumberMasked);
          window.setTimeout(() => {
            void this.router.navigateByUrl('/verification/summary');
          }, 1200);
        }
      },
      error: () => {
        this.pageError.set(this.verification.error() ?? 'Unable to load PAN verification status.');
      },
    });
  }

  onPanInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 10);
    this.form.controls.panNumber.setValue(value);
    input.value = value;
  }

  verifyPan(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.pageError.set('Please correct the highlighted fields.');
      return;
    }

    const dob = this.form.controls.dateOfBirth.value;
    if (this.isFutureDate(dob)) {
      this.pageError.set('Date of birth cannot be a future date.');
      return;
    }

    this.pageError.set(null);
    this.verifying.set(true);

    this.verification
      .verifyPan({
        panNumber: this.form.controls.panNumber.value,
        fullName: this.form.controls.fullName.value.trim(),
        dateOfBirth: dob,
      })
      .subscribe({
        next: (res) => {
          this.verifying.set(false);
          this.verified.set(true);
          this.maskedPan.set(res.panNumberMasked ?? null);

          window.setTimeout(() => {
            void this.router.navigateByUrl('/verification/summary');
          }, 1400);
        },
        error: () => {
          this.verifying.set(false);
          this.pageError.set(this.verification.error());
        },
      });
  }

  private isFutureDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return true;
    const selected = new Date(`${value}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selected.getTime() > today.getTime();
  }
}
