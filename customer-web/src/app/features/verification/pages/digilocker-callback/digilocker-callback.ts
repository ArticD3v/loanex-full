import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

/**
 * DigiLocker provider return target.
 * - Popup opener: notify parent and close (parent owns fetch).
 * - Same-tab fallback: resume on /verification with client_id.
 * Never falls through to app `**` → Home.
 */
@Component({
  selector: 'app-digilocker-callback',
  standalone: true,
  template: `
    <div class="lx-dl-cb">
      <p>{{ message() }}</p>
    </div>
  `,
  styles: [
    `
      .lx-dl-cb {
        min-height: 40vh;
        display: grid;
        place-items: center;
        padding: 2rem;
        text-align: center;
        color: #334155;
        font-family: system-ui, sans-serif;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DigilockerCallbackComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly message = signal('Completing DigiLocker verification…');

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const clientId =
      params.get('client_id') ||
      params.get('clientId') ||
      (typeof localStorage !== 'undefined'
        ? localStorage.getItem('digilocker_client_id')
        : null);

    const hasOpener =
      typeof window !== 'undefined' &&
      !!window.opener &&
      !window.opener.closed;

    if (hasOpener) {
      try {
        window.opener.postMessage(
          {
            type: 'loanex-digilocker-complete',
            client_id: clientId,
          },
          window.location.origin,
        );
      } catch {
        /* cross-origin opener — parent still polls */
      }
      this.message.set('Verification complete. You can close this window.');
      window.setTimeout(() => {
        try {
          window.close();
        } catch {
          /* ignore */
        }
        // If the browser blocks close, still land on verification.
        void this.router.navigate(['/verification'], {
          queryParams: clientId ? { client_id: clientId } : {},
          replaceUrl: true,
        });
      }, 400);
      return;
    }

    void this.router.navigate(['/verification'], {
      queryParams: clientId ? { client_id: clientId } : {},
      replaceUrl: true,
    });
  }
}
