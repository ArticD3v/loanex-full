# Order Tracking

Customer order tracking after Order Confirmation, plus Admin status updates used by the Android Admin App.

## Customer APIs

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/orders/:orderId` | JWT (own order only) |
| GET | `/api/v1/orders/:orderId/tracking` | JWT (own order only) |
| GET | `/api/v1/orders/:orderId/invoice` | JWT (own order only) — PDF |

## Admin API

| Method | Path | Auth |
|--------|------|------|
| PATCH | `/api/v1/admin/orders/:orderId/status` | JWT |

### Allowed transitions

`ORDER_CONFIRMED` → `PROCESSING` → `PACKED` → `SHIPPED` → `OUT_FOR_DELIVERY` → `DELIVERED`

Alias: `CONFIRMED` maps to `ORDER_CONFIRMED`.

Invalid transitions return `400`.

### On DELIVERED

1. Order status → `DELIVERED`
2. Tracking event inserted
3. EMI application status → `ACTIVE_EMI`
4. Audits: `ORDER_STATUS_UPDATED`, `LOAN_ACTIVATED`
5. Customer UI enables **Go To EMI Dashboard**

## Database

- Table `orders` (shipping fields + invoice path)
- Table `order_tracking` (`id`, `orderId`, `status`, `remarks`, `updatedBy`, `location`, `createdAt`)

## Frontend

- Route: `/orders/:orderId`
- Component: `OrderTrackingComponent`
- Polls tracking every **60 seconds**
- Buttons: Refresh Status, Contact Support, Download Invoice, Back, Go To EMI Dashboard

## Audit actions

- `ORDER_VIEWED`
- `ORDER_STATUS_UPDATED`
- `LOAN_ACTIVATED` (when delivered)
- `INVOICE_DOWNLOADED`

## Swagger

See `docs/openapi.json` → tags **Orders** and **Admin**.

## Postman

Import `docs/LoanEx-Order-Tracking.postman_collection.json`.
