# Feature / Wishlist

Saved products wishlist — real APIs, no mock data.

## Route

`/wishlist` → `WishlistComponent` (auth guard)

## Page

Shows product image, name, brand, price, discount, stock status, date added.

Actions: Move to Cart · View Product · Remove · Continue Shopping

## Integration

- Product Details “Add to Wishlist” / “Wishlisted” via `WishlistService`
- Navbar badge via `LayoutUiService.wishlistCount`
- Move to cart refreshes cart count

## APIs

- `POST /api/v1/wishlist`
- `GET /api/v1/wishlist`
- `GET /api/v1/wishlist/status/:productId`
- `DELETE /api/v1/wishlist/:wishlistItemId`
- `POST /api/v1/wishlist/:wishlistItemId/move-to-cart`
