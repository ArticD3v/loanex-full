import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { Dialog } from 'primeng/dialog';
import { formatInr } from '../../../../shared/utils/currency';
import {
  ApprovedLoanOffer,
  EmiApplicationService,
} from '../../services/emi-application.service';

@Component({
  selector: 'app-approved-loan-offer',
  imports: [Dialog],
  templateUrl: './approved-loan-offer.html',
  styleUrl: './approved-loan-offer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApprovedLoanOfferComponent implements OnInit {
  private readonly emiApi = inject(EmiApplicationService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly offer = signal<ApprovedLoanOffer | null>(null);
  readonly declineVisible = signal(false);

  readonly hasInterestRate = computed(() => {
    const rate = this.offer()?.interestRate;
    return rate !== null && rate !== undefined;
  });

  readonly hasProcessingFee = computed(() => {
    const fee = this.offer()?.processingFee;
    return fee !== null && fee !== undefined && fee > 0;
  });

  ngOnInit(): void {
    this.loadOffer();
  }

  formatMoney(value: number | null | undefined): string {
    if (value === null || value === undefined) return '—';
    return formatInr(value);
  }

  formatDate(value: string | undefined | null): string {
    if (!value) return '—';
    return new Date(value).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatRate(value: number | null | undefined): string {
    if (value === null || value === undefined) return '—';
    return `${value}% p.a.`;
  }

  acceptOffer(): void {
    if (this.submitting()) return;
    this.submitting.set(true);
    this.error.set(null);

    this.emiApi.acceptOffer().subscribe({
      next: () => {
        this.submitting.set(false);
        void this.router.navigateByUrl('/application/down-payment');
      },
      error: () => {
        this.submitting.set(false);
        this.error.set(this.emiApi.error() ?? 'Unable to accept offer.');
      },
    });
  }

  openDeclineDialog(): void {
    this.declineVisible.set(true);
  }

  closeDeclineDialog(): void {
    if (this.submitting()) return;
    this.declineVisible.set(false);
  }

  confirmDecline(): void {
    if (this.submitting()) return;
    this.submitting.set(true);
    this.error.set(null);

    this.emiApi.declineOffer().subscribe({
      next: () => {
        this.submitting.set(false);
        this.declineVisible.set(false);
        void this.router.navigateByUrl('/');
      },
      error: () => {
        this.submitting.set(false);
        this.error.set(this.emiApi.error() ?? 'Unable to decline offer.');
      },
    });
  }

  private loadOffer(): void {
    this.loading.set(true);
    this.error.set(null);

    this.emiApi.getCurrentOffer().subscribe({
      next: (data) => {
        this.loading.set(false);
        this.offer.set(data);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(this.emiApi.error() ?? 'Unable to load approved offer.');
        this.redirectFromOfferError(err);
      },
    });
  }

  private redirectFromOfferError(err: unknown): void {
    const body = err as {
      error?: { details?: { status?: string; code?: string }; code?: string };
    };
    const status = body?.error?.details?.status;
    const code = body?.error?.details?.code ?? body?.error?.code;

    if (code === 'OFFER_ALREADY_ACCEPTED' || status === 'OFFER_ACCEPTED') {
      void this.router.navigateByUrl('/application/down-payment');
      return;
    }

    if (status === 'PENDING' || status === 'UNDER_REVIEW') {
      void this.router.navigateByUrl('/application/pending');
      return;
    }

    if (status === 'REJECTED') {
      void this.router.navigateByUrl('/application/rejected');
    }
  }
}
