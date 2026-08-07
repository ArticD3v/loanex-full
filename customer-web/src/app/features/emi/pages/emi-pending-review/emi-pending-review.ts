import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  EmiApplication,
  EmiApplicationService,
} from '../../services/emi-application.service';

@Component({
  selector: 'app-emi-pending-review',
  imports: [RouterLink],
  templateUrl: './emi-pending-review.html',
  styleUrl: './emi-pending-review.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmiPendingReviewComponent implements OnInit {
  private readonly emiApi = inject(EmiApplicationService);

  readonly loading = this.emiApi.loading;
  readonly error = signal<string | null>(null);
  readonly application = signal<EmiApplication | null>(null);
  readonly refreshing = signal(false);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.refreshing.set(true);
    this.emiApi.getStatus().subscribe({
      next: (data) => {
        this.refreshing.set(false);
        this.application.set(data.application ?? null);
        if (!data.hasApplication) {
          this.error.set('No EMI application found.');
        }
      },
      error: () => {
        this.refreshing.set(false);
        this.error.set(this.emiApi.error() ?? 'Unable to load application status.');
      },
    });
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
}
