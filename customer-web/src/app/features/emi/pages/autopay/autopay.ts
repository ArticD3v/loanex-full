import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { formatInr } from '../../../../shared/utils/currency';
import { AutopayService, AutopayStatus } from '../../services/autopay.service';

@Component({
  selector: 'app-autopay',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './autopay.html',
  styleUrl: './autopay.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AutopayComponent implements OnInit {
  private readonly autopayApi = inject(AutopayService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly info = signal<string | null>(null);
  readonly status = signal<AutopayStatus | null>(null);
  readonly showMandate = signal(false);

  readonly form = this.fb.nonNullable.group({
    paymentMethod: ['UPI_AUTOPAY', Validators.required],
    bankName: [''],
    upiId: [''],
    maximumDebitAmount: [''],
  });

  readonly selectedMethod = computed(() => this.form.controls.paymentMethod.value);

  ngOnInit(): void {
    this.load();
  }

  enableAutopay(): void {
    if (this.submitting() || !this.status()?.canEnable) return;
    this.submitting.set(true);
    this.error.set(null);
    this.info.set(null);

    const raw = this.form.getRawValue();
    const maxDebit = raw.maximumDebitAmount.trim()
      ? Number(raw.maximumDebitAmount)
      : undefined;

    this.autopayApi
      .createMandate({
        paymentMethod: raw.paymentMethod,
        bankName: raw.bankName.trim() || undefined,
        upiId: raw.upiId.trim() || undefined,
        maximumDebitAmount: maxDebit && Number.isFinite(maxDebit) ? maxDebit : undefined,
      })
      .subscribe({
        next: (result) => {
          this.submitting.set(false);
          this.info.set(result.message ?? 'Mandate created successfully.');
          this.showMandate.set(true);
          this.load();
        },
        error: () => {
          this.submitting.set(false);
          this.error.set(this.autopayApi.error() ?? 'Unable to create AutoPay mandate.');
        },
      });
  }

  disableAutopay(): void {
    if (this.submitting() || !this.status()?.canDisable) return;
    this.submitting.set(true);
    this.error.set(null);

    this.autopayApi.cancelMandate().subscribe({
      next: (result) => {
        this.submitting.set(false);
        this.info.set(result.message ?? 'AutoPay disabled.');
        this.showMandate.set(false);
        this.load();
      },
      error: () => {
        this.submitting.set(false);
        this.error.set(this.autopayApi.error() ?? 'Unable to cancel AutoPay mandate.');
      },
    });
  }

  viewMandate(): void {
    this.showMandate.set(true);
  }

  formatMoney(value: number | null | undefined): string {
    if (value === null || value === undefined) return '—';
    return formatInr(value);
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  formatStatus(value: string | null | undefined): string {
    if (!value) return '—';
    return value.replaceAll('_', ' ');
  }

  private load(): void {
    this.loading.set(true);
    this.autopayApi.getStatus().subscribe({
      next: (data) => {
        this.loading.set(false);
        this.status.set(data);
        if (!this.form.controls.maximumDebitAmount.value) {
          this.form.patchValue({
            maximumDebitAmount: String(Math.round(data.loan.emiAmount * 1.2)),
          });
        }
        if (data.mandate) {
          this.showMandate.set(true);
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set(this.autopayApi.error() ?? 'Unable to load AutoPay status.');
      },
    });
  }
}
