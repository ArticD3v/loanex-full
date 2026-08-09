import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { OrderConfirmationComponent } from './order-confirmation';
import { OrderService } from '../../services/order.service';

/**
 * Smoke spec for the EMI down-payment redirect banner.
 * The customer-web redirect (after POST /payments/verify) lands on
 * /order/confirmation?paymentSuccess=true&paymentId=...&orderId=... and this
 * page must render the success banner with the real payment id. Run via
 * `scripts/smoke-emi-banner.mjs` (headless Chrome) so regressions in the
 * redirect contract or banner markup fail CI instead of shipping.
 */

const FAKE_ORDER = {
  id: 'ord-smoke-1',
  orderNumber: 'LX-ORD-SMOKE-0001',
  applicationNumber: 'LX-EMI-SMOKE-0001',
  productName: 'Smoke Phone',
  productImage: 'https://example.com/phone.png',
  productPrice: 109999,
  amountPaid: 11588.82,
  remainingLoanAmount: 98999,
  transactionDate: '2026-08-08T00:00:00.000Z',
  paymentId: 'pay_smoke_real',
  estimatedDeliveryDate: '2026-08-15T00:00:00.000Z',
  orderStatus: 'ORDER_CONFIRMED',
  timeline: { shipped: false, delivered: false },
} as never;

function routeWith(params: Record<string, string>) {
  return {
    provide: ActivatedRoute,
    useValue: { snapshot: { queryParamMap: convertToParamMap(params) } },
  };
}

function stubOrderService() {
  return {
    provide: OrderService,
    useValue: { getById: () => of(FAKE_ORDER) },
  };
}

async function render(params: Record<string, string>): Promise<ComponentFixture<OrderConfirmationComponent>> {
  await TestBed.configureTestingModule({
    imports: [OrderConfirmationComponent],
    providers: [
      provideRouter([]),
      provideNoopAnimations(),
      routeWith(params),
      stubOrderService(),
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(OrderConfirmationComponent);
  fixture.detectChanges();
  return fixture;
}

describe('OrderConfirmationComponent · EMI down-payment banner', () => {
  it('renders the success banner with the payment id from the redirect params', async () => {
    const fixture = await render({
      paymentSuccess: 'true',
      paymentId: 'pay_smoke_test_123',
      orderId: 'ord-smoke-1',
    });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.lx-oc__banner')).toBeTruthy();
    expect(el.textContent).toContain('Down payment successful!');
    expect(el.textContent).toContain('pay_smoke_test_123');
    expect(el.textContent).toContain('View your order');
  });

  it('renders the replayed variant with the payment id when alreadyProcessed=true', async () => {
    const fixture = await render({
      paymentSuccess: 'true',
      paymentId: 'pay_old_999',
      alreadyProcessed: 'true',
      orderId: 'ord-smoke-1',
    });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Down payment already received');
    expect(el.textContent).toContain('pay_old_999');
  });

  it('does not render the banner without paymentSuccess', async () => {
    const fixture = await render({ orderId: 'ord-smoke-1' });
    expect(fixture.nativeElement.querySelector('.lx-oc__banner')).toBeFalsy();
  });

  it('dismiss removes the banner and strips the redirect params', async () => {
    const fixture = await render({
      paymentSuccess: 'true',
      paymentId: 'pay_x',
      orderId: 'ord-smoke-1',
    });
    fixture.componentInstance.dismissBanner();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.lx-oc__banner')).toBeFalsy();
  });
});
