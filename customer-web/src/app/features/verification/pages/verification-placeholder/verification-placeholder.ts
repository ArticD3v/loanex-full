import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-verification-placeholder',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="lx-placeholder">
      <h1>{{ heading }}</h1>
      <p>This verification step will be available in the next release.</p>
      <a routerLink="/verification" class="lx-btn lx-btn--primary">Back to Verification Dashboard</a>
    </section>
  `,
  styles: `
    .lx-placeholder {
      max-width: 36rem;
      margin: 2rem auto;
      padding: 1.5rem;
      background: #fff;
      border: 1px solid #e5e9f0;
      border-radius: 1rem;
      text-align: center;
      box-shadow: 0 8px 24px rgba(10, 46, 111, 0.05);
    }
    h1 {
      margin: 0 0 0.5rem;
      color: #0a2e6f;
      font-size: 1.4rem;
    }
    p {
      margin: 0 0 1.2rem;
      color: #6b7280;
    }
    a {
      text-decoration: none;
    }
  `,
})
export class VerificationPlaceholder {
  private readonly route = inject(ActivatedRoute);

  readonly heading =
    (this.route.snapshot.routeConfig?.title as string | undefined)?.replace(' — LoanEx', '') ||
    'Verification Step';
}
