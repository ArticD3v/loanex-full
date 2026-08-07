import {

  ChangeDetectionStrategy,

  Component,

  OnInit,

  computed,

  inject,

  signal,

} from '@angular/core';

import { Router } from '@angular/router';

import {

  AppNotification,

  NotificationFilter,

  NotificationService,

} from '../../services/notification.service';



const FILTERS: Array<{ id: NotificationFilter; label: string }> = [

  { id: 'ALL', label: 'All' },

  { id: 'UNREAD', label: 'Unread' },

  { id: 'LOAN', label: 'Loan' },

  { id: 'ORDERS', label: 'Orders' },

  { id: 'PAYMENTS', label: 'Payments' },

  { id: 'OFFERS', label: 'Offers' },

  { id: 'SYSTEM', label: 'System' },

];



@Component({

  selector: 'app-notification-center',

  imports: [],

  templateUrl: './notification-center.html',

  styleUrl: './notification-center.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,

})

export class NotificationCenterComponent implements OnInit {

  private readonly notificationsApi = inject(NotificationService);

  private readonly router = inject(Router);



  readonly filters = FILTERS;

  readonly loading = signal(true);

  readonly acting = signal(false);

  readonly error = signal<string | null>(null);

  readonly info = signal<string | null>(null);

  readonly activeFilter = signal<NotificationFilter>('ALL');

  readonly items = signal<AppNotification[]>([]);

  readonly unreadCount = signal(0);



  readonly emptyMessage = computed(() => {

    const filter = this.activeFilter();

    if (filter === 'UNREAD') return 'You have no unread notifications.';

    if (filter === 'ALL') return 'No notifications yet.';

    return `No ${filter.toLowerCase()} notifications.`;

  });



  ngOnInit(): void {

    this.load();

  }



  setFilter(filter: NotificationFilter): void {

    if (this.activeFilter() === filter) return;

    this.activeFilter.set(filter);

    this.load();

  }



  isClickable(item: AppNotification): boolean {

    return Boolean(this.resolveNavigationTarget(item));

  }



  onItemClick(item: AppNotification): void {

    const target = this.resolveNavigationTarget(item);

    if (!target) return;



    if (item.isRead) {

      void this.router.navigateByUrl(target);

      return;

    }



    if (this.acting()) return;

    this.acting.set(true);

    this.error.set(null);



    this.notificationsApi.markRead(item.id).subscribe({

      next: (updated) => {

        this.acting.set(false);

        this.items.update((list) =>

          list.map((row) => (row.id === updated.id ? updated : row)),

        );

        this.unreadCount.update((count) => Math.max(0, count - 1));

        void this.router.navigateByUrl(target);

      },

      error: () => {

        this.acting.set(false);

        this.error.set(this.notificationsApi.error() ?? 'Unable to mark as read.');

      },

    });

  }



  markRead(item: AppNotification, event?: Event): void {

    event?.stopPropagation();

    if (item.isRead || this.acting()) return;

    this.acting.set(true);

    this.error.set(null);



    this.notificationsApi.markRead(item.id).subscribe({

      next: (updated) => {

        this.acting.set(false);

        this.items.update((list) =>

          list.map((row) => (row.id === updated.id ? updated : row)),

        );

        this.unreadCount.update((count) => Math.max(0, count - 1));

        this.info.set('Notification marked as read.');

      },

      error: () => {

        this.acting.set(false);

        this.error.set(this.notificationsApi.error() ?? 'Unable to mark as read.');

      },

    });

  }



  markAllRead(): void {

    if (this.acting() || this.unreadCount() === 0) return;

    this.acting.set(true);

    this.error.set(null);



    this.notificationsApi.markAllRead().subscribe({

      next: () => {

        this.acting.set(false);

        this.info.set('All notifications marked as read.');

        this.load();

      },

      error: () => {

        this.acting.set(false);

        this.error.set(this.notificationsApi.error() ?? 'Unable to mark all as read.');

      },

    });

  }



  deleteNotification(item: AppNotification, event?: Event): void {

    event?.stopPropagation();

    if (this.acting()) return;

    this.acting.set(true);

    this.error.set(null);



    this.notificationsApi.delete(item.id).subscribe({

      next: () => {

        this.acting.set(false);

        this.items.update((list) => list.filter((row) => row.id !== item.id));

        if (!item.isRead) {

          this.unreadCount.update((count) => Math.max(0, count - 1));

        }

        this.info.set('Notification deleted.');

      },

      error: () => {

        this.acting.set(false);

        this.error.set(this.notificationsApi.error() ?? 'Unable to delete notification.');

      },

    });

  }



  formatDate(value: string | null | undefined): string {

    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '—';

    return date.toLocaleString('en-IN', {

      day: '2-digit',

      month: 'short',

      year: 'numeric',

      hour: '2-digit',

      minute: '2-digit',

    });

  }



  private resolveNavigationTarget(item: AppNotification): string | null {

    const metadata = item.metadata;

    if (!metadata || typeof metadata !== 'object') {

      if (item.type === 'APPLICATION_APPROVED') {

        const orderId = this.metadataString(metadata, 'orderId');

        return orderId ? `/orders/${orderId}` : null;

      }

      return null;

    }



    const actionUrl = metadata['actionUrl'];

    if (typeof actionUrl === 'string' && actionUrl.trim()) {

      return actionUrl.startsWith('/') ? actionUrl : `/${actionUrl}`;

    }



    const orderId = this.metadataString(metadata, 'orderId');

    if (orderId) {

      return `/orders/${orderId}`;

    }



    if (item.type === 'APPLICATION_APPROVED' && orderId) {

      return `/orders/${orderId}`;

    }



    return null;

  }



  private metadataString(

    metadata: Record<string, unknown> | null,

    key: string,

  ): string | null {

    if (!metadata) return null;

    const value = metadata[key];

    return typeof value === 'string' && value.trim() ? value : null;

  }



  private load(): void {

    this.loading.set(true);

    this.error.set(null);



    this.notificationsApi.list(this.activeFilter()).subscribe({

      next: (data) => {

        this.loading.set(false);

        this.items.set(data.items);

        this.unreadCount.set(data.unreadCount);

      },

      error: () => {

        this.loading.set(false);

        this.items.set([]);

        this.error.set(this.notificationsApi.error() ?? 'Unable to load notifications.');

      },

    });

  }

}

