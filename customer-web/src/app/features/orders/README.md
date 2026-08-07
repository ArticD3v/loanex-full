# Feature / Orders

Order history and order detail experiences for authenticated customers.

## Routes

| Path | Component | Guard |
|------|-----------|-------|
| `/my-orders` | `MyOrdersComponent` | `authGuard` |
| `/my-orders/:orderId` | `OrderDetailsComponent` | `authGuard` |
| `/orders/:orderId` | `OrderDetailsComponent` | `authGuard` |

Notifications and My Orders both open the same order details page at `/orders/:orderId`.

Order details includes EMI loan info and, when the application is approved and unpaid, **Pay Down Payment** (Razorpay) plus an optional AutoPay dialog after success.

## API

Uses `OrderService` (`features/emi/services/order.service.ts`):

- `list()` — order history
- `getById(orderId)` — order details
- `getTracking(orderId)` — delivery timeline
- `downloadInvoice(orderId)` — PDF blob download

Down payment uses `PaymentService`; AutoPay uses `AutopayService`.

Base URL: `${environment.apiBaseUrl}/api/v1/orders`

## Lazy loading

List is registered from `app.routes.ts` via `loadChildren` → `ORDERS_ROUTES`. Detail routes are top-level in `app.routes.ts`.
