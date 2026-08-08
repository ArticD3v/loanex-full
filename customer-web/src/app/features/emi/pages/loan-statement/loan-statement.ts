import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatInr } from '../../../../shared/utils/currency';
import {
  EmiHistoryService,
  LoanStatementResponse,
  PaymentHistoryFilters,
} from '../../services/emi-history.service';

@Component({
  selector: 'app-loan-statement',
  imports: [RouterLink],
  templateUrl: './loan-statement.html',
  styleUrl: './loan-statement.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanStatementComponent implements OnInit {
  private readonly historyApi = inject(EmiHistoryService);

  readonly loading = signal(true);
  readonly downloading = signal(false);
  readonly error = signal<string | null>(null);
  readonly info = signal<string | null>(null);
  readonly statement = signal<LoanStatementResponse | null>(null);

  ngOnInit(): void {
    this.load();
  }

  downloadStatementPdf(): void {
    this.downloadFile(
      this.historyApi.downloadStatementPdf(),
      'loan-statement.pdf',
      'Loan statement downloaded.',
    );
  }

  downloadHistoryPdf(): void {
    this.downloadFile(
      this.historyApi.downloadHistoryPdf(this.defaultFilters()),
      'payment-history.pdf',
      'Payment history PDF downloaded.',
    );
  }

  downloadHistoryExcel(): void {
    this.downloadFile(
      this.historyApi.downloadHistoryExcel(this.defaultFilters()),
      'payment-history.xlsx',
      'Payment history Excel downloaded.',
    );
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
    this.historyApi.getStatement().subscribe({
      next: (data) => {
        this.loading.set(false);
        this.statement.set(data);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(this.historyApi.error() ?? 'Unable to load loan statement.');
      },
    });
  }

  private defaultFilters(): PaymentHistoryFilters {
    return { paymentType: 'EMI' };
  }

  private downloadFile(
    source: ReturnType<EmiHistoryService['downloadStatementPdf']>,
    fileName: string,
    successMessage: string,
  ): void {
    if (this.downloading()) return;
    this.downloading.set(true);
    this.error.set(null);
    this.info.set(null);

    source.subscribe({
      next: (blob) => {
        this.downloading.set(false);
        const typed =
          blob.type && blob.type !== 'application/octet-stream'
            ? blob
            : new Blob([blob], {
                type: fileName.endsWith('.xlsx')
                  ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                  : 'application/pdf',
              });
        const url = URL.createObjectURL(typed);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        anchor.rel = 'noopener';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        this.info.set(successMessage);
      },
      error: () => {
        this.downloading.set(false);
        this.error.set(this.historyApi.error() ?? 'Unable to download file.');
      },
    });
  }
}
