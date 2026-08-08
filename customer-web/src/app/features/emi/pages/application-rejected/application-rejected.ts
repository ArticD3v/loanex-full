import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EmiApplicationService } from '../../services/emi-application.service';

@Component({
  selector: 'app-application-rejected',
  imports: [RouterLink],
  template: `
    <div class="lx-result">
      <section class="lx-result__card">
        <div class="lx-result__icon is-bad" aria-hidden="true"><i class="pi pi-times"></i></div>
        <h1>Application Rejected</h1>
        <p>Your EMI application was not approved at this time.</p>
        @if (reason()) {
          <p class="lx-result__reason">{{ reason() }}</p>
        }
        @if (applicationNumber()) {
          <p class="lx-result__meta">Application Number: <strong>{{ applicationNumber() }}</strong></p>
        }
        <div class="lx-result__actions">
          <a routerLink="/my-emis" class="lx-btn lx-btn--outline">Back to My EMIs</a>
          <a routerLink="/products" class="lx-btn lx-btn--primary">Browse Products</a>
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .lx-result {
        display: grid;
        place-items: center;
        padding: 1rem 0 2rem;
      }
      .lx-result__card {
        width: min(100%, 34rem);
        background: #fff;
        border: 1px solid #e5e9f0;
        border-radius: 1rem;
        padding: 1.75rem 1.4rem;
        box-shadow: 0 12px 32px rgba(10, 46, 111, 0.08);
        display: grid;
        gap: 0.75rem;
        justify-items: center;
        text-align: center;
      }
      .lx-result__icon {
        width: 3.5rem;
        height: 3.5rem;
        border-radius: 999px;
        display: grid;
        place-items: center;
        color: #fff;
        font-size: 1.35rem;
      }
      .lx-result__icon.is-bad {
        background: #dc2626;
      }
      h1 {
        margin: 0;
        color: #0a2e6f;
        font-size: 1.5rem;
        font-weight: 800;
      }
      p {
        margin: 0;
        color: #6b7280;
        line-height: 1.55;
      }
      .lx-result__reason {
        width: 100%;
        padding: 0.75rem 0.9rem;
        border-radius: 0.7rem;
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #991b1b;
        font-weight: 600;
      }
      .lx-result__meta {
        color: #0a2e6f;
      }
      .lx-result__actions {
        display: flex;
        gap: 0.65rem;
        flex-wrap: wrap;
        justify-content: center;
        padding-top: 0.35rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApplicationRejectedComponent implements OnInit {
  private readonly emiApi = inject(EmiApplicationService);
  private readonly route = inject(ActivatedRoute);
  readonly applicationNumber = signal<string | null>(null);
  readonly reason = signal<string | null>(null);

  ngOnInit(): void {
    const applicationId =
      this.route.snapshot.queryParamMap.get('applicationId') ?? undefined;
    const request$ = applicationId
      ? this.emiApi.getById(applicationId, 'viewed')
      : this.emiApi.getCurrent('viewed');

    request$.subscribe({
      next: (data) => {
        this.applicationNumber.set(data.applicationNumber);
        this.reason.set(data.rejectionReason);
      },
      error: () => undefined,
    });
  }
}
