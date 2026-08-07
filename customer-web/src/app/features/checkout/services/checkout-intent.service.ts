import { Injectable, signal } from '@angular/core';

export interface CheckoutIntent {
  productId: string;
  variantId?: string;
  quantity: number;
  mode: 'BUY_NOW' | 'CART';
}

const STORAGE_KEY = 'loanex.checkoutIntent';

@Injectable({ providedIn: 'root' })
export class CheckoutIntentService {
  private readonly intentSignal = signal<CheckoutIntent | null>(this.read());

  readonly intent = this.intentSignal.asReadonly();

  save(intent: CheckoutIntent): void {
    this.intentSignal.set(intent);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(intent));
    }
  }

  get(): CheckoutIntent | null {
    return this.intentSignal() ?? this.read();
  }

  clear(): void {
    this.intentSignal.set(null);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }

  private read(): CheckoutIntent | null {
    if (typeof sessionStorage === 'undefined') return null;
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CheckoutIntent;
    } catch {
      return null;
    }
  }
}
