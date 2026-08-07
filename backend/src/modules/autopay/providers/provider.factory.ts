import { env } from '../../../config/env';
import type { AutopayProvider } from './autopay-provider';
import { RazorpayAutopayProvider, StubAutopayProvider } from './stub.provider';

let cached: AutopayProvider | null = null;

/**
 * Factory — switch providers via AUTOPAY_PROVIDER without changing business services.
 * Values: STUB (default) | RAZORPAY
 */
export function getAutopayProvider(): AutopayProvider {
  if (cached) return cached;

  const code = (env.AUTOPAY_PROVIDER ?? 'STUB').toUpperCase();
  cached = code === 'RAZORPAY' ? new RazorpayAutopayProvider() : new StubAutopayProvider();
  return cached;
}

export function resetAutopayProviderCache(): void {
  cached = null;
}
