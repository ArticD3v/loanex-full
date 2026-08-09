import { Injectable, signal } from '@angular/core';

export type PendingCheckout =
  | { kind: 'DIRECT'; sessionId: string }
  | { kind: 'EMI_DOWN_PAYMENT'; applicationId: string };

const STORAGE_KEY = 'loanex.pendingCheckout';

/**
 * Remembers a checkout the customer abandoned by dismissing the payment modal.
 * The server-side session (and the cart) stay intact until payment succeeds, so
 * this lets the cart surface a "Resume checkout" prompt that sends the customer
 * straight back to a fresh payment attempt. Cleared once payment lands.
 */
@Injectable({ providedIn: 'root' })
export class PendingCheckoutService {
  private readonly pendingSignal = signal<PendingCheckout | null>(this.read());

  readonly pending = this.pendingSignal.asReadonly();

  save(pending: PendingCheckout): void {
    this.pendingSignal.set(pending);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
    }
  }

  get(): PendingCheckout | null {
    return this.pendingSignal() ?? this.read();
  }

  clear(): void {
    this.pendingSignal.set(null);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  private read(): PendingCheckout | null {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as PendingCheckout;
      if (
        parsed &&
        ((parsed.kind === 'DIRECT' && parsed.sessionId) ||
          (parsed.kind === 'EMI_DOWN_PAYMENT' && parsed.applicationId))
      ) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }
}
