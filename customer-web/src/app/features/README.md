# Features

Lazy-loadable product domains for LoanEx. Import from `@features/*`.

Each feature owns its components, routes, and local state. Register routes in `app.routes.ts` via `loadChildren` / `loadComponent` when implemented.

## Domains

| Feature | Intended responsibility |
|---------|-------------------------|
| `home/` | Landing / discovery entry |
| `auth/` | Authentication UX (no logic in foundation) |
| `products/` | Catalog and product detail |
| `wishlist/` | Saved products |
| `cart/` | Shopping cart |
| `checkout/` | Checkout flow |
| `orders/` | Order history and detail |
| `profile/` | User profile |
| `emi/` | EMI / financing experiences |
| `notifications/` | In-app notifications |
| `support/` | Help and support |
| `search/` | Search experience |

## Rules

- Features must not import from sibling features; share via `shared/` or `core/`.
- No pages, UI, or business logic in this foundation step.
