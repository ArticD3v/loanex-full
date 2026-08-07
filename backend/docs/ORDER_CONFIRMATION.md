## Order Confirmation

### APIs

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/orders/current` | JWT |
| GET | `/api/v1/orders/:orderId` | JWT |
| GET | `/api/v1/orders/:orderId/receipt` | JWT |

### Frontend

- Route: `/order/confirmation`
- Legacy redirect: `/application/order-confirmation` → `/order/confirmation`

### Audit

- `PAYMENT_SUCCESS`
- `ORDER_CREATED`
- `ORDER_CONFIRMED`
- `ORDER_VIEWED`
- `RECEIPT_DOWNLOADED`
