import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Dialog } from 'primeng/dialog';
import { OtpVerificationDialogComponent } from '../../../auth/components/otp-verification-dialog/otp-verification-dialog';
import { AuthService } from '../../../../core/services/auth.service';
import { VerificationService } from '../../services/verification.service';

@Component({
  selector: 'app-mobile-verification',
  imports: [ReactiveFormsModule, RouterLink, Dialog, OtpVerificationDialogComponent],
  templateUrl: './mobile-verification.html',
  styleUrl: './mobile-verification.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileVerificationComponent implements OnInit {
  private readonly verification = inject(VerificationService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = this.verification.loading;
  readonly pageError = signal<string | null>(null);
  readonly otpError = signal<string | null>(null);
  readonly otpVisible = signal(false);
  readonly otpSuccess = signal(false);
  readonly changeVisible = signal(false);
  readonly sending = signal(false);
  readonly verifying = signal(false);

  readonly mobileControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)],
  });

  readonly displayMobile = signal('');
  readonly mobileVerified = signal(false);

  readonly formattedMobile = computed(() => this.formatIndianMobile(this.displayMobile()));

  readonly steps = [
    { key: 'mobile', label: 'Mobile', index: 1 },
    { key: 'aadhaar', label: 'Aadhaar', index: 2 },
    { key: 'pan', label: 'PAN', index: 3 },
    { key: 'bank', label: 'Bank Account', index: 4 },
    { key: 'complete', label: 'Complete', index: 5 },
  ] as const;

  ngOnInit(): void {
    const userMobile = this.auth.user()?.mobile ?? '';
    this.displayMobile.set(userMobile);
    this.mobileControl.setValue(userMobile);

    this.verification.getMobileStatus().subscribe({
      next: (status) => {
        this.displayMobile.set(status.mobile);
        this.mobileControl.setValue(status.mobile);
        this.mobileVerified.set(status.mobileVerified);

        if (status.mobileVerified) {
          void this.router.navigateByUrl('/aadhaar-verification');
        }
      },
      error: () => {
        this.pageError.set(this.verification.error() ?? 'Unable to load mobile verification status.');
      },
    });
  }

  sendOtp(): void {
    this.pageError.set(null);
    this.otpError.set(null);
    this.sending.set(true);

    this.verification.sendMobileOtp().subscribe({
      next: (res) => {
        this.sending.set(false);
        this.displayMobile.set(res.mobile);

        if (res.mobileVerified) {
          void this.router.navigateByUrl('/aadhaar-verification');
          return;
        }

        this.otpSuccess.set(false);
        this.otpVisible.set(true);
      },
      error: () => {
        this.sending.set(false);
        this.pageError.set(this.verification.error());
      },
    });
  }

  openChangeMobile(): void {
    this.mobileControl.setValue(this.displayMobile());
    this.mobileControl.markAsUntouched();
    this.changeVisible.set(true);
  }

  saveChangedMobile(): void {
    this.mobileControl.markAsTouched();
    if (this.mobileControl.invalid) return;

    const mobile = this.mobileControl.value;
    this.pageError.set(null);
    this.otpError.set(null);
    this.sending.set(true);

    this.verification.sendMobileOtp({ mobile }).subscribe({
      next: (res) => {
        this.sending.set(false);
        this.displayMobile.set(res.mobile);
        this.changeVisible.set(false);
        this.otpSuccess.set(false);
        this.otpVisible.set(true);
      },
      error: () => {
        this.sending.set(false);
        this.pageError.set(this.verification.error());
      },
    });
  }

  onOtpVerified(otp: string): void {
    this.otpError.set(null);
    this.verifying.set(true);

    this.verification.verifyMobileOtp({ otp, mobile: this.displayMobile() }).subscribe({
      next: () => {
        this.verifying.set(false);
        this.otpSuccess.set(true);
        this.mobileVerified.set(true);

        window.setTimeout(() => {
          this.otpVisible.set(false);
          void this.router.navigateByUrl('/aadhaar-verification');
        }, 1200);
      },
      error: () => {
        this.verifying.set(false);
        this.otpError.set(this.verification.error());
      },
    });
  }

  onOtpResend(): void {
    this.otpError.set(null);
    this.sending.set(true);

    this.verification.sendMobileOtp({ mobile: this.displayMobile() }).subscribe({
      next: () => {
        this.sending.set(false);
      },
      error: () => {
        this.sending.set(false);
        this.otpError.set(this.verification.error());
      },
    });
  }

  private formatIndianMobile(mobile: string): string {
    const digits = mobile.replace(/\D/g, '').slice(-10);
    if (digits.length !== 10) {
      return mobile ? `+91 ${mobile}` : '—';
    }
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
}
