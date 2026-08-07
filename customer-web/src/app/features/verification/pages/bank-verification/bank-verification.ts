import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { VerificationService } from '../../services/verification.service';

@Component({
  selector: 'app-bank-verification',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './bank-verification.html',
  styleUrl: './bank-verification.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BankVerificationComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly verification = inject(VerificationService);
  private readonly router = inject(Router);

  readonly pageError = signal<string | null>(null);
  readonly verifying = signal(false);
  readonly verified = signal(false);
  readonly maskedAccount = signal<string | null>(null);
  readonly bankName = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    accountHolderName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    bankName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    accountNumber: ['', [Validators.required, Validators.pattern(/^\d{8,18}$/)]],
    confirmAccountNumber: ['', [Validators.required, Validators.pattern(/^\d{8,18}$/)]],
    ifscCode: ['', [Validators.required, Validators.pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)]],
    accountType: ['SAVINGS' as 'SAVINGS' | 'CURRENT', [Validators.required]],
  });

  readonly steps = [
    { key: 'mobile', label: 'Mobile Verified', index: 1 },
    { key: 'aadhaar', label: 'Aadhaar', index: 2 },
    { key: 'pan', label: 'PAN', index: 3 },
    { key: 'bank', label: 'Bank Account', index: 4 },
    { key: 'complete', label: 'Complete', index: 5 },
  ] as const;

  ngOnInit(): void {
    this.verification.getBankStatus().subscribe({
      next: (status) => {
        if (!status.panVerified) {
          void this.router.navigateByUrl('/verification/pan');
          return;
        }

        if (status.bankVerified) {
          this.verified.set(true);
          this.maskedAccount.set(status.accountNumberMasked);
          this.bankName.set(status.bankName);
          window.setTimeout(() => {
            void this.router.navigateByUrl('/verification/summary');
          }, 1200);
        }
      },
      error: () => {
        this.pageError.set(
          this.verification.error() ?? 'Unable to load bank verification status.',
        );
      },
    });
  }

  onIfscInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 11);
    this.form.controls.ifscCode.setValue(value);
    input.value = value;
  }

  onAccountInput(control: 'accountNumber' | 'confirmAccountNumber', event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '').slice(0, 18);
    this.form.controls[control].setValue(value);
    input.value = value;
  }

  verifyBank(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.pageError.set('Please correct the highlighted fields.');
      return;
    }

    const { accountNumber, confirmAccountNumber } = this.form.getRawValue();
    if (accountNumber !== confirmAccountNumber) {
      this.pageError.set('Account number and confirm account number must match.');
      return;
    }

    this.pageError.set(null);
    this.verifying.set(true);
    const payload = this.form.getRawValue();

    this.verification.verifyBank(payload).subscribe({
      next: (res) => {
        this.verifying.set(false);
        this.verified.set(true);
        this.maskedAccount.set(res.accountNumberMasked ?? null);
        this.bankName.set(res.bankName ?? payload.bankName);

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
}
