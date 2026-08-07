import { Injectable, signal } from '@angular/core';

export interface EmiPlanSelection {
  productId: string;
  variantId?: string;
  productName: string;
  sellingPrice: number;
  requestedAmount: number;
  requestedDownPayment: number;
  requestedTenure: number;
  estimatedMonthlyEmi: number;
}

const STORAGE_KEY = 'loanex.emiPlanSelection';

@Injectable({ providedIn: 'root' })
export class EmiPlanSelectionService {
  private readonly selectionSignal = signal<EmiPlanSelection | null>(this.read());

  readonly selection = this.selectionSignal.asReadonly();

  save(selection: EmiPlanSelection): void {
    this.selectionSignal.set(selection);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
    }
  }

  get(): EmiPlanSelection | null {
    return this.selectionSignal() ?? this.read();
  }

  clear(): void {
    this.selectionSignal.set(null);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }

  private read(): EmiPlanSelection | null {
    if (typeof sessionStorage === 'undefined') return null;
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as EmiPlanSelection;
    } catch {
      return null;
    }
  }
}
