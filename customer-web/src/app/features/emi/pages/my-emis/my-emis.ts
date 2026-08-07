import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { environment } from '../../../../../environments/environment';
import {
  EmiApplicationHistoryItem,
  EmiApplicationHistoryResponse,
  EmiApplicationService,
} from '../../services/emi-application.service';
import { formatInr } from '../../../../shared/utils/currency';

type TabKey = 'pending' | 'ongoing' | 'completed' | 'rejected';

interface Cta {
  label: string;
  routerLink: string;
  queryParams?: Record<string, string>;
}

const TAB_ORDER: TabKey[] = ['pending', 'ongoing', 'completed', 'rejected'];

const PENDING_STATUSES = new Set(['PENDING', 'UNDER_REVIEW', 'APPROVED']);

const ONGOING_STATUSES = new Set([
  'OFFER_ACCEPTED',
  'DOWN_PAYMENT_PENDING',
  'DOWN_PAYMENT_COMPLETED',
  'ORDER_CONFIRMED',
  'ACTIVE_EMI',
]);

const REJECTED_STATUSES = new Set(['REJECTED', 'DECLINED_BY_CUSTOMER']);

@Component({
  selector: 'app-my-emis',
  imports: [RouterLink, TitleCasePipe],
  templateUrl: './my-emis.html',
  styleUrl: './my-emis.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyEmisComponent implements OnInit {
  private readonly emiApi = inject(EmiApplicationService);

  readonly formatInr = formatInr;
  readonly showDevApprove = !environment.production;
  readonly tabs = TAB_ORDER;
  readonly activeTab = signal<TabKey>('pending');
  readonly loading = signal(true);
  readonly approving = signal(false);
  readonly error = signal<string | null>(null);
  readonly data = signal<EmiApplicationHistoryResponse | null>(null);

  readonly tabCounts = computed<Record<TabKey, number>>(() => {
    const items = this.data()?.items ?? [];
    const counts: Record<TabKey, number> = { pending: 0, ongoing: 0, completed: 0, rejected: 0 };
    for (const item of items) counts[this.sectionFor(item)] += 1;
    return counts;
  });

  readonly visibleItems = computed<EmiApplicationHistoryItem[]>(() => {
    const items = this.data()?.items ?? [];
    const tab = this.activeTab();
    return items.filter((item) => this.sectionFor(item) === tab);
  });

  ngOnInit(): void {
    this.load();
  }

  setTab(tab: TabKey): void {
    this.activeTab.set(tab);
  }

  sectionFor(item: EmiApplicationHistoryItem): TabKey {
    if (item.loanStatus === 'CLOSED') return 'completed';
    if (PENDING_STATUSES.has(item.status)) return 'pending';
    if (ONGOING_STATUSES.has(item.status)) return 'ongoing';
    if (REJECTED_STATUSES.has(item.status)) return 'rejected';
    return 'pending';
  }

  ctaFor(item: EmiApplicationHistoryItem): Cta {
    switch (item.nextStep) {
      case 'VIEW_OFFER':
        return { label: 'View Approved Offer', routerLink: '/application/approved' };
      case 'PAY_DOWN_PAYMENT':
        return { label: 'Pay Down Payment', routerLink: '/application/down-payment' };
      case 'VIEW_LOAN':
        return { label: 'View My EMI', routerLink: '/my-emi' };
      case 'VIEW_ORDER':
        return item.orderId
          ? { label: 'Track Order', routerLink: `/orders/${item.orderId}` }
          : { label: 'Order Confirmation', routerLink: '/order/confirmation' };
      case 'APPLY_AGAIN':
        return item.status === 'REJECTED'
          ? { label: 'View Rejection Details', routerLink: '/application/rejected' }
          : { label: 'Continue Shopping', routerLink: '/products' };
      case 'LOAN_COMPLETED':
        return { label: 'View Loan Statement', routerLink: '/my-emi/statement' };
      default:
        return { label: 'View Status', routerLink: '/application/pending' };
    }
  }

  statusTone(status: string): string {
    if (status === 'ACTIVE_EMI') return 'is-active';
    if (status === 'REJECTED' || status === 'DECLINED_BY_CUSTOMER') return 'is-danger';
    if (status === 'APPROVED' || status === 'OFFER_ACCEPTED') return 'is-success';
    return 'is-pending';
  }

  statusLabel(status: string): string {
    return status.replaceAll('_', ' ');
  }

  canDevApprove(item: EmiApplicationHistoryItem): boolean {
    return this.showDevApprove && (item.status === 'PENDING' || item.status === 'UNDER_REVIEW');
  }

  devApprove(item: EmiApplicationHistoryItem): void {
    if (this.approving()) return;
    this.approving.set(true);
    this.error.set(null);

    this.emiApi.devApprove().subscribe({
      next: () => {
        this.approving.set(false);
        this.load();
      },
      error: () => {
        this.approving.set(false);
        this.error.set(this.emiApi.error() ?? 'Unable to approve application.');
      },
    });
  }

  formatDate(value: string | null): string {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.emiApi.getHistory().subscribe({
      next: (data) => {
        this.loading.set(false);
        this.data.set(data);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(this.emiApi.error() ?? 'Unable to load your EMI applications.');
      },
    });
  }
}
