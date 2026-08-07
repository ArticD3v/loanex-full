# Customer Features

Backend APIs for orders list, product catalog, product reviews, and customer support.

## Orders (extended)

Base: `/api/v1/orders` (JWT required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/orders` | List all orders for the authenticated user |
| GET | `/orders/current` | Latest order |
| GET | `/orders/:orderId` | Order detail (includes paymentType, emi, addresses) |

List item shape: `id`, `orderNumber`, `orderDate`, `orderAmount`, `paymentType` (`EMI`), `orderStatus`, `product`.

## Products (public)

Base: `/api/v1/products` (no auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/products` | Paginated catalog with search, filters, sort |
| GET | `/products/:productId` | Single product |

Query params: `search`, `brand`, `category`, `minPrice`, `maxPrice`, `availability` (`IN_STOCK` \| `OUT_OF_STOCK` \| `ALL`), `emiAvailable`, `sort` (`price_asc` \| `price_desc` \| `latest` \| `name`), `page`, `limit`.

Response includes `pagination` and `filters` (distinct brands/categories).

## Reviews

Base: `/api/v1/reviews`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/reviews` | JWT | Create review |
| GET | `/reviews/:productId` | Optional JWT | List reviews; `myReview` when logged in |
| PUT | `/reviews/:reviewId` | JWT | Update own review |
| DELETE | `/reviews/:reviewId` | JWT | Delete own review |

Rules:

- Only users with a non-cancelled order for the product may review
- One review per user per product (409 on duplicate)
- Rating 1–5 integer; review text min 10 chars

## Support

Base: `/api/v1/support` (JWT required)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/support` | Create ticket |
| GET | `/support` | List user's tickets |
| GET | `/support/:ticketId` | Ticket detail (own only) |

Ticket number format: `LX-SUP-` + timestamp (base36) + 4 random chars. Default status: `OPEN`.

## Smoke

```bash
npx tsx scripts/smoke-customer-features.ts
```

See `docs/LoanEx-Customer-Features.postman_collection.json`.
