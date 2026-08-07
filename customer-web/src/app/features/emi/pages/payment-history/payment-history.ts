import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { formatInr } from '../../../../shared/utils/currency';
import {
  EmiHistoryService,
  PaymentHistoryItem,
  PaymentHistoryResponse,
} from '../../services/emi-history.service';

@Component({
  selector: 'app-payment-history',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './payment-history.html',
  styleUrl: './payment-history.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentHistoryComponent implements OnInit {
  private readonly historyApi = inject(EmiHistoryService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly downloading = signal(false);
  readonly error = signal<string | null>(null);
  readonly info = signal<string | null>(null);
  readonly history = signal<PaymentHistoryResponse | null>(null);

  readonly filterForm = this.fb.nonNullable.group({
    dateFrom: [''],
    dateTo: [''],
    status: [''],
    paymentType: ['EMI'],
    search: [''],
  });

  ngOnInit(): void {
    this.load();
  }

  applyFilters(): void {
    this.load();
  }

  resetFilters(): void {
    this.filterForm.reset({
      dateFrom: '',
      dateTo: '',
      status: '',
      paymentType: 'EMI',
      search: '',
    });
    this.load();
  }

  downloadHistoryPdf(): void {
    this.download('pdf');
  }

  downloadHistoryExcel(): void {
    this.download('excel');
  }

  downloadReceipt(item: PaymentHistoryItem): void {
    if (!item.receiptAvailable || this.downloading()) return;
    this.downloading.set(true);
    this.error.set(null);

    this.historyApi.downloadReceipt(item.id).subscribe({
      next: (blob) => {
        this.downloading.set(false);
        this.saveBlob(blob, `emi-${item.emiNumber ?? 'payment'}-receipt.pdf`);
        this.info.set('Receipt downloaded.');
      },
      error: () => {
        this.downloading.set(false);
        this.error.set(this.historyApi.error() ?? 'Unable to download receipt.');
      },
    });
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
    this.error.set(null);
    const filters = this.filterForm.getRawValue();

    this.historyApi.getPaymentHistory(filters).subscribe({
      next: (data) => {
        this.loading.set(false);
        this.history.set(data);
      },
      error: () => {
        this.loading.set(false);
        this.history.set(null);
        this.error.set(this.historyApi.error() ?? 'Unable to load payment history.');
      },
    });
  }

  private download(format: 'pdf' | 'excel'): void {
    if (this.downloading()) return;
    this.downloading.set(true);
    this.error.set(null);
    const filters = this.filterForm.getRawValue();
    const source =
      format === 'pdf'
        ? this.historyApi.downloadHistoryPdf(filters)
        : this.historyApi.downloadHistoryExcel(filters);

    source.subscribe({
      next: (blob) => {
        this.downloading.set(false);
        const ext = format === 'pdf' ? 'pdf' : 'xlsx';
        this.saveBlob(blob, `payment-history.${ext}`);
        this.info.set(`Payment history ${format.toUpperCase()} downloaded.`);
      },
      error: () => {
        this.downloading.set(false);
        this.error.set(this.historyApi.error() ?? 'Unable to export payment history.');
      },
    });
  }

  private saveBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
