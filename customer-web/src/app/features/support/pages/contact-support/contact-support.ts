import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import {
  SupportIssueType,
  SupportService,
  SupportTicket,
  SupportTicketListResponse,
} from '../../services/support.service';

const MAX_ATTACHMENT_BYTES = 500 * 1024;

@Component({
  selector: 'app-contact-support',
  imports: [ReactiveFormsModule],
  templateUrl: './contact-support.html',
  styleUrl: './contact-support.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactSupportComponent implements OnInit {
  private readonly supportApi = inject(SupportService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly info = signal<string | null>(null);
  readonly tickets = signal<SupportTicketListResponse | null>(null);
  readonly createdTicket = signal<SupportTicket | null>(null);
  readonly attachmentWarning = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    issueType: ['ORDER_ISSUE' as SupportIssueType, Validators.required],
    subject: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
    description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(5000)]],
    attachment: [''],
  });

  ngOnInit(): void {
    this.loadTickets();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (file.size > MAX_ATTACHMENT_BYTES) {
      this.attachmentWarning.set('Attachment exceeds 500KB limit and was not added.');
      input.value = '';
      this.form.patchValue({ attachment: '' });
      return;
    }

    this.attachmentWarning.set(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      this.form.patchValue({ attachment: result });
    };
    reader.readAsDataURL(file);
  }

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    this.info.set(null);
    this.createdTicket.set(null);

    const value = this.form.getRawValue();
    this.supportApi
      .create({
        issueType: value.issueType,
        subject: value.subject.trim(),
        description: value.description.trim(),
        attachment: value.attachment || undefined,
      })
      .subscribe({
        next: (ticket) => {
          this.submitting.set(false);
          this.createdTicket.set(ticket);
          this.info.set(`Ticket ${ticket.ticketNumber} submitted successfully.`);
          this.form.reset({
            issueType: 'ORDER_ISSUE',
            subject: '',
            description: '',
            attachment: '',
          });
          this.loadTickets();
        },
        error: () => {
          this.submitting.set(false);
          this.error.set(this.supportApi.error() ?? 'Unable to submit ticket.');
        },
      });
  }

  issueLabel(type: string): string {
    return type.replaceAll('_', ' ');
  }

  statusClass(status: string): string {
    const normalized = status.toUpperCase();
    if (normalized === 'RESOLVED' || normalized === 'CLOSED') return 'is-resolved';
    if (normalized === 'IN_PROGRESS') return 'is-progress';
    return 'is-open';
  }

  formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  private loadTickets(): void {
    if (!this.auth.isAuthenticated()) {
      this.loading.set(false);
      this.error.set('Please log in to contact support.');
      return;
    }

    this.loading.set(true);
    this.supportApi.list().subscribe({
      next: (data) => {
        this.loading.set(false);
        this.tickets.set(data);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(this.supportApi.error() ?? 'Unable to load tickets.');
      },
    });
  }
}
