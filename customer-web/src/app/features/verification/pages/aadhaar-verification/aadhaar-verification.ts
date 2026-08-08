import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { VerificationService } from '../../services/verification.service';

@Component({
  selector: 'app-aadhaar-verification',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './aadhaar-verification.html',
  styleUrl: './aadhaar-verification.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AadhaarVerificationComponent implements OnInit {
  private readonly verification = inject(VerificationService);
  private readonly router = inject(Router);

  // Flow state
  readonly step = signal<'enter' | 'redirect' | 'fetching' | 'done'>('enter');
  readonly pageError = signal<string | null>(null);
  readonly loading = signal(false);
  readonly verified = signal(false);
  readonly consent = signal(true);

  // Data returned from DigiLocker
  readonly digilockerClientId = signal<string | null>(null);
  readonly digilockerUrl = signal<string | null>(null);
  readonly kycData = signal<{
    name: string; gender: string; dob: string;
    masked_aadhaar: string; father_name: string;
    profile_image: string;
  } | null>(null);

  readonly aadhaarControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^\d{12}$/)],
  });

  ngOnInit(): void {
    this.verification.getAadhaarStatus().subscribe({
      next: (status) => {
        if (status.aadhaarVerified) {
          this.verified.set(true);
          this.step.set('done');
        }
        // If there's a pending client_id in DB (user started but didn't finish)
        if ((status as any).client_id && !status.aadhaarVerified) {
          this.digilockerClientId.set((status as any).client_id);
          this.step.set('redirect');
        }
      },
      error: () => {
        this.pageError.set(this.verification.error() ?? 'Unable to load verification status.');
      },
    });
  }

  onAadhaarInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 12);
    this.aadhaarControl.setValue(digits);
    this.aadhaarControl.markAsTouched();
    input.value = this.formatAadhaar(digits);
  }

  /** Step 1: Enter Aadhaar → Generate DigiLocker token */
  generateDigilocker(): void {
    this.aadhaarControl.markAsTouched();
    if (this.aadhaarControl.invalid) {
      this.pageError.set('Please enter a valid 12-digit Aadhaar number.');
      return;
    }
    if (!this.consent()) {
      this.pageError.set('Please accept the consent to proceed.');
      return;
    }

    this.pageError.set(null);
    this.loading.set(true);

    this.verification.digilockerGenerate(this.aadhaarControl.value).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.digilockerClientId.set(res.client_id);
        this.digilockerUrl.set(res.digilocker_url);
        this.step.set('redirect');
      },
      error: () => {
        this.loading.set(false);
        this.pageError.set(this.verification.error() ?? 'Failed to generate DigiLocker link.');
      },
    });
  }

  /** Step 2: Open DigiLocker in new tab */
  openDigilocker(): void {
    const url = this.digilockerUrl();
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  /** Step 3: After user completes DigiLocker, fetch their data */
  fetchAadhaarDetails(): void {
    const clientId = this.digilockerClientId();
    if (!clientId) {
      this.pageError.set('Session expired. Please start again.');
      this.step.set('enter');
      return;
    }

    this.pageError.set(null);
    this.step.set('fetching');
    this.loading.set(true);

    this.verification.digilockerFetch(clientId).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.kycData.set({
          name: res.name,
          gender: res.gender,
          dob: res.dob,
          masked_aadhaar: res.masked_aadhaar,
          father_name: res.father_name,
          profile_image: res.profile_image,
        });
        this.verified.set(true);
        this.step.set('done');
      },
      error: () => {
        this.loading.set(false);
        this.step.set('redirect');
        this.pageError.set(
          this.verification.error() ??
            'Could not fetch Aadhaar details. Please complete DigiLocker verification first.',
        );
      },
    });
  }

  continueToPan(): void {
    void this.router.navigateByUrl('/verification');
  }

  startOver(): void {
    this.step.set('enter');
    this.aadhaarControl.reset();
    this.pageError.set(null);
    this.digilockerClientId.set(null);
    this.digilockerUrl.set(null);
  }

  formatAadhaar(value: string): string {
    const d = value.replace(/\D/g, '').slice(0, 12);
    return [d.slice(0, 4), d.slice(4, 8), d.slice(8, 12)].filter(Boolean).join(' ');
  }
}
