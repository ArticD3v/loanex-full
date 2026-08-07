## Down Payment (Razorpay)

### APIs

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/payments/down-payment` | JWT |
| POST | `/api/v1/payments/create-order` | JWT |
| POST | `/api/v1/payments/verify` | JWT |
| GET | `/api/v1/payments/:applicationId` | JWT |
| GET | `/api/v1/payments/order-confirmation` | JWT |

### Flow

1. Customer status must be `OFFER_ACCEPTED` (or `DOWN_PAYMENT_PENDING`)
2. Create Razorpay order
3. Checkout / verify signature on backend
4. `paymentStatus = SUCCESS`
5. `emi_application.status = DOWN_PAYMENT_COMPLETED`
6. Create `orders` row (`PLACED`)
7. Navigate to `/application/order-confirmation`

### Env

```
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
PAYMENT_DEV_BYPASS=true   # local only
GST_PERCENT=18
```
