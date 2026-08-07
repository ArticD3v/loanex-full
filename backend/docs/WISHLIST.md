# Wishlist

Customer wishlist for saving products and moving them into the cart.

## Frontend

- Route: `/wishlist` (auth required)
- Feature: `LoanEx/src/app/features/wishlist`
- Product Details: Add to Wishlist / Wishlisted toggle uses real APIs
- Navbar badge synced via `LayoutUiService.wishlistCount`

## Backend

Base: `/api/v1/wishlist` (JWT required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/wishlist` | List wishlist items |
| POST | `/wishlist` | Add product (`{ productId }`) |
| GET | `/wishlist/status/:productId` | In-wishlist status helper |
| DELETE | `/wishlist/:wishlistItemId` | Remove item |
| POST | `/wishlist/:wishlistItemId/move-to-cart` | Move to cart, remove from wishlist |

## Rules

- Unique `(userId, productId)` — duplicate add returns `409`
- Move to cart removes wishlist row; increases existing cart quantity when present
- Out-of-stock products cannot move to cart
- Users only access their own rows

## Database

Table `wishlist_items` (Prisma `WishlistItem`) — created with cart migration.

## Smoke

```bash
npx tsx scripts/smoke-wishlist.ts
```

See also `docs/openapi.json` (tag **Wishlist**) and `docs/LoanEx-Wishlist.postman_collection.json`.
