# LoanEx — Full Backend & Database Reference for Admin App Development

> **Instructions for Vibe Coding Agent**: You are building a **React Native (Expo Go) Admin App** for the LoanEx platform.
> The existing website's backend is a **Node.js + Express REST API** running on port **4000**.
> The backend uses a **flat JSON file** (`backend/data/db.json`) as its database — there is NO SQL or MongoDB.
> Your admin app must connect to the **same backend API** (same base URL, same endpoints) and must use the same `db.json` data.
> Do NOT create a new backend. Simply call the existing API endpoints listed in this document.
> All admin-specific endpoints already exist under `/api/v1/admin/...`.
> Authentication uses **JWT tokens stored in cookies** (or you can store the token in AsyncStorage for mobile and send it as a `Bearer` token in the `Authorization` header).
> The base URL for the API is: **`http://<YOUR_PC_IP>:4000`** (e.g., `http://192.168.29.29:4000`).

---

## 1. Technology Stack (Existing Backend)

| Layer | Technology |
|---|---|
| Runtime | Node.js (TypeScript) |
| Framework | Express.js |
| Database | `backend/data/db.json` (flat JSON file) |
| Auth | JWT (HttpOnly cookies + Bearer token support) |
| API Prefix | `/api/v1` |
| Port | `4000` |
| CORS | Open — accepts any origin (`origin: true`) |

---

## 2. Database Schema (`db.json`)

The database is a single JSON file with the following top-level collection keys. Each collection is an **array of objects**. All IDs are strings (UUIDs or custom IDs like `id_<timestamp>_<random>`).

### 2.1 `users`
Stores authentication accounts. One user per phone number.

```json
{
  "id": "uuid-string",
  "phone": "9462557060",
  "email": "user@example.com",
  "role": "customer",
  "created_at": "ISO-date",
  "updated_at": "ISO-date"
}
```

**role** values: `"customer"` | `"admin"`

---

### 2.2 `profiles`
Extended user profile. Has same `id` as the user.

```json
{
  "id": "same-as-user-id",
  "mobile_number": "9462557060",
  "fullName": "Musharraf Gouri",
  "email": "user@example.com",
  "dob": "1998-05-15",
  "gender": "MALE",
  "kyc_status": "Approved",
  "createdAt": "ISO-date",
  "updatedAt": "ISO-date"
}
```

**kyc_status** values: `"Pending"` | `"Approved"` | `"Rejected"`

---

### 2.3 `addresses`
Delivery/shipping addresses linked to a user.

```json
{
  "id": "uuid-string",
  "profileId": "user-id",
  "userId": "user-id",
  "house_number": "123",
  "street": "MG Road",
  "landmark": "Near Park",
  "city": "Hyderabad",
  "state": "Telangana",
  "pincode": "500059",
  "label": "HOME",
  "addressType": "SHIPPING",
  "is_default": true,
  "fullAddress": "123, MG Road, Hyderabad, Telangana - 500059",
  "createdAt": "ISO-date",
  "updatedAt": "ISO-date"
}
```

---

### 2.4 `categories`
Product categories.

```json
{
  "id": "cat-smartphones",
  "name": "Smartphones",
  "description": "Latest flagship mobile phones",
  "icon": "pi pi-mobile",
  "color": "#3b82f6",
  "bgColor": "#eff6ff",
  "status": "active",
  "sortOrder": 1,
  "createdAt": "ISO-date"
}
```

**Existing category IDs**: `cat-smartphones`, `cat-laptops`, `cat-appliances`, `cat-electronics`

---

### 2.5 `brands`
```json
{
  "id": "brand-apple",
  "name": "Apple",
  "logo": "",
  "status": "active"
}
```

---

### 2.6 `products`
The main product catalogue (50+ products).

```json
{
  "id": "uuid-or-custom-id",
  "name": "Apple iPhone 15 Pro Max 256GB",
  "slug": "iphone-15promax-256",
  "sku": "IPHONE-15PROMAX-256",
  "brand": "Apple",
  "description": "Full description text",
  "shortDescription": "Short one-liner",
  "categoryId": "cat-smartphones",
  "image": "https://images.unsplash.com/...",
  "galleryImages": ["url1", "url2"],
  "price": 139900,
  "mrp": 159900,
  "discount": 20000,
  "stock": 50,
  "availableStock": 50,
  "reservedStock": 0,
  "status": "active",
  "emiAvailable": true,
  "featured": true,
  "trending": true,
  "recommended": true,
  "warranty": "1 Year Apple Warranty",
  "createdAt": "ISO-date",
  "updatedAt": "ISO-date"
}
```

**status** values: `"active"` | `"inactive"`

---

### 2.7 `product_emi_plans`
EMI plan configurations per product.

```json
{
  "id": "plan-iphone-3m",
  "productId": "product-id",
  "planName": "3 Months Standard",
  "months": 3,
  "downPayment": 15000,
  "serviceCharge": 500,
  "deliveryCharge": 0,
  "minEligibilityAmount": 5000,
  "customerVisibility": "visible",
  "createdAt": "ISO-date",
  "updatedAt": "ISO-date"
}
```

---

### 2.8 `orders`
Customer orders. Items are embedded directly in the order (no separate `order_items` table in use).

```json
{
  "id": "id_timestamp_random",
  "userId": "user-id",
  "profileId": "user-id",
  "addressId": "address-id",
  "totalAmount": 194989,
  "subtotal": 194989,
  "total": 194989,
  "paymentMethod": "FULL_PAYMENT",
  "payment_status": "PENDING",
  "status": "PENDING",
  "items": [
    {
      "productId": "product-id",
      "quantity": 1,
      "unitPrice": 129999
    }
  ],
  "notes": "storage/invoices/invoice_xxx.pdf",
  "createdAt": "ISO-date",
  "updatedAt": "ISO-date"
}
```

**paymentMethod** values: `"FULL_PAYMENT"` | `"EMI"`

**status** values: `"PENDING"` | `"CONFIRMED"` | `"PROCESSING"` | `"SHIPPED"` | `"DELIVERED"` | `"CANCELLED"`

**payment_status** values: `"PENDING"` | `"PAID"` | `"FAILED"` | `"REFUNDED"`

---

### 2.9 `emi_details`
Active EMI loan details after checkout.

```json
{
  "id": "uuid",
  "userId": "user-id",
  "orderId": "order-id",
  "productId": "product-id",
  "emiPlanId": "plan-id",
  "status": "ACTIVE",
  "totalAmount": 154990,
  "downPayment": 15000,
  "monthlyEmi": 11665,
  "tenure": 12,
  "remainingEmi": 10,
  "nextDueDate": "ISO-date",
  "createdAt": "ISO-date"
}
```

---

### 2.10 `cart_items`
Items currently in a user's cart.

```json
{
  "id": "uuid",
  "userId": "user-id",
  "productId": "product-id",
  "quantity": 1,
  "addedAt": "ISO-date"
}
```

---

### 2.11 `wishlist_items`
```json
{
  "id": "uuid",
  "userId": "user-id",
  "productId": "product-id",
  "addedAt": "ISO-date"
}
```

---

### 2.12 `customer_kyc`
KYC verification data per user.

```json
{
  "id": "uuid",
  "userId": "user-id",
  "aadharVerified": true,
  "aadhar_number": "xxxxxxxx0292",
  "fullName": "Mohd Musharraf Gouri",
  "dob": "05-07-2003",
  "gender": "M",
  "address": { "country": "India", "dist": "...", "state": "..." },
  "pan_verified": true,
  "panNumber": "EGHPG9093N",
  "cibil_score": 771,
  "createdAt": "ISO-date",
  "updatedAt": "ISO-date"
}
```

---

### 2.13 `notifications`
```json
{
  "id": "uuid",
  "userId": "user-id",
  "title": "Order Confirmed",
  "message": "Your order has been confirmed.",
  "type": "ORDER",
  "read": false,
  "createdAt": "ISO-date"
}
```

---

### 2.14 `banners`
Homepage promotional banners.

```json
{
  "id": "uuid",
  "title": "Summer Sale",
  "subtitle": "Up to 40% off",
  "image": "https://...",
  "ctaText": "Shop Now",
  "ctaLink": "/products",
  "isActive": true,
  "order": 1
}
```

---

### 2.15 Other Collections (exist but usually empty)
- `sub_categories` — subcategory definitions
- `order_items` — (unused; items embedded in orders)
- `experian_reports` — raw Experian credit report data
- `digilocker_reports` — raw DigiLocker Aadhaar data
- `reviews` — product reviews
- `support_tickets` — customer support tickets
- `autopay` — autopay mandates for EMI

---

## 3. Full API Reference

> **Base URL**: `http://<IP>:4000/api/v1`
> 
> **Authentication**: Send the JWT as a cookie (`token=...`) OR in the header: `Authorization: Bearer <token>`
>
> For the admin app, using the `Authorization: Bearer <token>` header in every request is the recommended approach.

---

### 3.1 Authentication (`/auth`)

| Method | Endpoint | Auth? | Description |
|---|---|---|---|
| POST | `/auth/send-otp` | No | Send OTP to phone. Body: `{ "phone": "9999999999" }` |
| POST | `/auth/verify-otp` | No | Verify OTP. Body: `{ "phone": "9999999999", "otp": "123456" }`. Returns `{ token, user }` |
| POST | `/auth/logout` | Yes | Logout / clear token cookie |
| GET | `/auth/me` | Yes | Get current logged-in user info |
| POST | `/auth/refresh` | Yes | Refresh JWT token |

> **Note**: OTP is always `111111` in development mode (no real SMS is sent).
> For admin login, there is no separate admin login endpoint — use the same OTP flow. Users with `role: "admin"` in the `users` collection have admin access.

---

### 3.2 Products (`/products`)

| Method | Endpoint | Auth? | Description |
|---|---|---|---|
| GET | `/products` | No | List all products. Query params: `page`, `limit`, `categoryId`, `featured`, `trending`, `recommended`, `search` |
| GET | `/products/:productId` | No | Get product by ID |
| GET | `/products/slug/:slug` | No | Get product by slug |
| POST | `/products` | No | **Create a new product**. Body: full product object |
| PUT | `/products/:productId` | No | **Update a product**. Body: partial product object |

**Create Product Body Example**:
```json
{
  "name": "Product Name",
  "slug": "product-slug",
  "sku": "SKU-XXXXX",
  "brand": "Apple",
  "description": "Full description",
  "shortDescription": "Short description",
  "categoryId": "cat-smartphones",
  "image": "https://image-url.com/img.jpg",
  "galleryImages": ["url1", "url2"],
  "price": 50000,
  "mrp": 60000,
  "discount": 10000,
  "stock": 100,
  "availableStock": 100,
  "status": "active",
  "emiAvailable": true,
  "featured": false,
  "trending": false,
  "recommended": false,
  "warranty": "1 Year Manufacturer Warranty"
}
```

---

### 3.3 Categories (`/categories`)

| Method | Endpoint | Auth? | Description |
|---|---|---|---|
| GET | `/categories` | No | List all categories |
| GET | `/categories/:categoryId` | No | Get single category |

---

### 3.4 Orders (`/orders`)

| Method | Endpoint | Auth? | Description |
|---|---|---|---|
| GET | `/orders` | Yes | List orders for the logged-in user |
| GET | `/orders/current` | Yes | Get the most recent/active order |
| GET | `/orders/:orderId` | Yes | Get a single order by ID |
| GET | `/orders/:orderId/tracking` | Yes | Get order tracking info |
| GET | `/orders/:orderId/receipt` | Yes | Download receipt PDF |
| GET | `/orders/:orderId/invoice` | Yes | Download invoice PDF |

---

### 3.5 Cart (`/cart`)

| Method | Endpoint | Auth? | Description |
|---|---|---|---|
| GET | `/cart` | Yes | Get cart for logged-in user |
| POST | `/cart` | Yes | Add item to cart. Body: `{ "productId": "...", "quantity": 1 }` |
| PUT | `/cart/:cartItemId` | Yes | Update item quantity. Body: `{ "quantity": 2 }` |
| DELETE | `/cart/:cartItemId` | Yes | Remove item from cart |
| DELETE | `/cart` | Yes | Clear the entire cart |

---

### 3.6 Checkout (`/checkout`)

| Method | Endpoint | Auth? | Description |
|---|---|---|---|
| POST | `/checkout` | Yes | Place an order. Body: see below |
| GET | `/checkout/summary` | Yes | Get checkout summary |

**Checkout Body Example**:
```json
{
  "addressId": "address-uuid",
  "paymentMethod": "FULL_PAYMENT",
  "items": [
    { "productId": "product-id", "quantity": 1, "unitPrice": 139900 }
  ]
}
```

---

### 3.7 Profile (`/profile`)

| Method | Endpoint | Auth? | Description |
|---|---|---|---|
| GET | `/profile` | Yes | Get user profile |
| POST | `/profile` | Yes | Create profile |
| PUT | `/profile` | Yes | Update profile |
| PATCH | `/profile/personal` | Yes | Update personal details only |
| GET | `/profile/addresses` | Yes | List all addresses |
| POST | `/profile/addresses` | Yes | Add a new address |
| PUT | `/profile/addresses/:addressId` | Yes | Update an address |
| DELETE | `/profile/addresses/:addressId` | Yes | Delete an address |
| PATCH | `/profile/addresses/:addressId/default` | Yes | Set address as default |

---

### 3.8 EMI Applications (`/emi/applications`)

| Method | Endpoint | Auth? | Description |
|---|---|---|---|
| POST | `/emi/applications` | Yes | Submit an EMI application |
| GET | `/emi/applications` | Yes | List user's EMI applications |
| GET | `/emi/applications/:applicationId` | Yes | Get a single EMI application |

---

### 3.9 Loans (`/loans`)

| Method | Endpoint | Auth? | Description |
|---|---|---|---|
| GET | `/loans` | Yes | List all loans for logged-in user |
| GET | `/loans/:loanId` | Yes | Get single loan detail |
| GET | `/loans/:loanId/emi-schedule` | Yes | Get EMI payment schedule |

---

### 3.10 EMI Payments (`/emi/payments`)

| Method | Endpoint | Auth? | Description |
|---|---|---|---|
| POST | `/emi/payments` | Yes | Make an EMI payment |
| GET | `/emi/payments` | Yes | List EMI payments |

---

### 3.11 EMI History (`/emi/payment-history`, `/emi/statement`)

| Method | Endpoint | Auth? | Description |
|---|---|---|---|
| GET | `/emi/payment-history` | Yes | Get EMI payment history |
| GET | `/emi/statement` | Yes | Get EMI statement |

---

### 3.12 Autopay (`/autopay`)

| Method | Endpoint | Auth? | Description |
|---|---|---|---|
| POST | `/autopay` | Yes | Set up autopay mandate |
| GET | `/autopay` | Yes | Get autopay status |
| DELETE | `/autopay` | Yes | Cancel autopay |

---

### 3.13 Notifications (`/notifications`)

| Method | Endpoint | Auth? | Description |
|---|---|---|---|
| GET | `/notifications` | Yes | List user's notifications |
| PATCH | `/notifications/:id/read` | Yes | Mark notification as read |
| PATCH | `/notifications/read-all` | Yes | Mark all notifications as read |
| DELETE | `/notifications/:id` | Yes | Delete a notification |

---

### 3.14 Wishlist (`/wishlist`)

| Method | Endpoint | Auth? | Description |
|---|---|---|---|
| GET | `/wishlist` | Yes | Get user's wishlist |
| POST | `/wishlist` | Yes | Add to wishlist. Body: `{ "productId": "..." }` |
| DELETE | `/wishlist/:wishlistItemId` | Yes | Remove from wishlist |
| POST | `/wishlist/:wishlistItemId/move-to-cart` | Yes | Move item to cart |
| GET | `/wishlist/status/:productId` | Yes | Check if product is in wishlist |

---

### 3.15 Reviews (`/reviews`)

| Method | Endpoint | Auth? | Description |
|---|---|---|---|
| POST | `/reviews` | Yes | Create a review |
| GET | `/reviews/:productId` | No | Get reviews for a product |
| PUT | `/reviews/:reviewId` | Yes | Update a review |
| DELETE | `/reviews/:reviewId` | Yes | Delete a review |

---

### 3.16 Support Tickets (`/support`)

| Method | Endpoint | Auth? | Description |
|---|---|---|---|
| POST | `/support` | Yes | Create a support ticket |
| GET | `/support` | Yes | List user's tickets |
| GET | `/support/:ticketId` | Yes | Get a ticket by ID |

---

### 3.17 Banners (`/banners`)

| Method | Endpoint | Auth? | Description |
|---|---|---|---|
| GET | `/banners` | No | List all active banners |

---

### 3.18 Verification (`/verification`)

| Method | Endpoint | Auth? | Description |
|---|---|---|---|
| GET | `/verification/status` | Yes | Get overall KYC status for user |
| GET | `/verification/mobile/status` | Yes | Get mobile verification status |
| GET | `/verification/aadhaar/status` | Yes | Get Aadhaar verification status |
| POST | `/verification/aadhaar/digilocker/generate` | Yes | Start DigiLocker Aadhaar flow |
| POST | `/verification/aadhaar/digilocker/fetch` | Yes | Fetch Aadhaar data after DigiLocker |
| POST | `/verification/pan/experian-credit-report` | Yes | Verify PAN and fetch Experian credit score |
| POST | `/verification/face-match` | Yes | Verify face match (selfie vs Aadhaar photo). Body: `{ "capturedImage": "base64string" }` |

---

### 3.19 Payments (`/payments`)

| Method | Endpoint | Auth? | Description |
|---|---|---|---|
| POST | `/payments/initiate` | Yes | Initiate a payment |
| POST | `/payments/verify` | Yes | Verify payment status |
| GET | `/payments/history` | Yes | Get payment history |

---

## 4. Admin-Only API Endpoints (`/admin`)

> **IMPORTANT**: All `/admin` endpoints require authentication. However, currently the backend does **NOT** check if the user role is `admin` — it only checks if they are logged in. For the admin app, ensure you only let users with `role: "admin"` access these screens.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/emi-applications` | List ALL EMI applications (all users) |
| POST | `/admin/emi-applications/:applicationId/approve` | Approve an EMI application |
| PATCH | `/admin/orders/:orderId/status` | Update an order's status/tracking |
| GET | `/admin/loans` | List all loans (all users) |
| GET | `/admin/loans/:loanId` | Get a single loan detail |
| PATCH | `/admin/loans/:loanId` | Update loan details |
| GET | `/admin/emi-payments` | List all EMI payments |
| GET | `/admin/autopay` | List all autopay mandates |
| GET | `/admin/autopay/:loanId` | Get autopay for a loan |
| PATCH | `/admin/autopay/:loanId` | Update autopay settings |
| GET | `/admin/notifications` | List all notifications |
| POST | `/admin/notifications` | Create a broadcast notification |
| DELETE | `/admin/notifications/:id` | Delete a notification |

**Update Order Status Body Example**:
```json
{
  "status": "SHIPPED",
  "remarks": "Order dispatched from warehouse",
  "location": "Mumbai Hub",
  "courierPartner": "Blue Dart",
  "trackingNumber": "BD123456789",
  "warehouse": "Mumbai Central",
  "deliveryAddress": "Full delivery address"
}
```

**Create Notification Body Example**:
```json
{
  "userId": "user-id",
  "title": "Special Offer!",
  "message": "Get 20% off on all laptops today.",
  "type": "PROMOTION"
}
```

---

## 5. Standard API Response Format

All API responses follow this structure:

**Success Response**:
```json
{
  "success": true,
  "message": "Products fetched",
  "data": { ... }
}
```

**Error Response**:
```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

**Common HTTP Status Codes**:
- `200` — Success
- `201` — Created
- `400` — Bad request / validation error
- `401` — Unauthenticated (token missing or invalid)
- `403` — Forbidden
- `404` — Not found
- `429` — Too many requests (rate limited)
- `500` — Internal server error

---

## 6. Admin App — Feature Requirements

> **Instructions for Vibe Coding Agent**: Build the following screens for the Expo Go admin app. Each screen should call the corresponding API endpoints listed above.

### Screen 1: Login
- Phone number input + OTP verification
- Use `POST /auth/send-otp` and `POST /auth/verify-otp`
- After login, check `user.role === "admin"`. If not admin, show "Access Denied".
- Store the JWT token in `AsyncStorage` and send it as `Authorization: Bearer <token>` on every request.

### Screen 2: Dashboard (Home)
Show summary statistics by fetching:
- Total products count from `GET /products`
- Total orders from `GET /admin/emi-applications` (use length)
- Pending EMI applications count
- Recent orders list

### Screen 3: Products Management
- List all products with image, name, price, stock, status
- Tap a product to edit it (call `PUT /products/:productId`)
- Button to add a new product (call `POST /products`)
- Filter by category

### Screen 4: Orders Management
- List all orders by fetching `GET /admin/loans` and cross-referencing with orders
- **IMPORTANT**: To get ALL orders (not just for the logged-in admin), you should directly call `GET /admin/loans` for EMI orders, and for all orders you can create a custom endpoint or fetch `GET /orders` for each user.
- Each order row shows: Order ID, User, Amount, Status, Date
- Tap an order to update its status via `PATCH /admin/orders/:orderId/status`

### Screen 5: EMI Applications
- List all EMI applications via `GET /admin/emi-applications`
- Show: Applicant name, product, amount, status
- Button to approve via `POST /admin/emi-applications/:applicationId/approve`

### Screen 6: Loans Management
- List all loans via `GET /admin/loans`
- Show loan details via `GET /admin/loans/:loanId`
- Update loan via `PATCH /admin/loans/:loanId`

### Screen 7: Notifications
- List all notifications via `GET /admin/notifications`
- Create a new broadcast notification via `POST /admin/notifications`
- Delete a notification via `DELETE /admin/notifications/:id`

### Screen 8: Users / KYC
- No dedicated admin endpoint exists for listing all users.
- You can read the `users` and `profiles` collections from the `db.json` file directly if needed, or add a new admin endpoint to the backend.

---

## 7. Adding a New Admin Endpoint (If Needed)

> **Instructions**: If you need an endpoint that doesn't exist (e.g., `GET /admin/users`), you can add it to the existing backend file at `loanexweb-main/backend/src/modules/admin/admin.routes.ts`.

**Example — Add GET /admin/users**:
```typescript
// In admin.routes.ts, add:
import { jsonDb } from '../../config/json-db';

adminRouter.get('/users', asyncHandler(async (req, res) => {
  const users = jsonDb.findMany('users', {});
  const profiles = jsonDb.findMany('profiles', {});
  const usersWithProfiles = users.map(user => ({
    ...user,
    profile: profiles.find(p => p.id === user.id) || null,
  }));
  res.json({ success: true, data: usersWithProfiles, message: 'Users fetched' });
}));

// Similarly for KYC:
adminRouter.get('/kyc', asyncHandler(async (req, res) => {
  const kyc = jsonDb.findMany('customer_kyc', {});
  res.json({ success: true, data: kyc, message: 'KYC records fetched' });
}));

// For all orders:
adminRouter.get('/orders', asyncHandler(async (req, res) => {
  const orders = jsonDb.findMany('orders', {});
  res.json({ success: true, data: orders, message: 'All orders fetched' });
}));
```

Then restart the backend with `npm run dev`.

---

## 8. Important Notes for the Admin App

1. **CORS**: The backend already allows all origins (`origin: true`), so no CORS issues.
2. **HTTP not HTTPS**: The backend runs on plain HTTP. On Android, this is fine. On iOS, you may need to add `NSAppTransportSecurity` exception in `Info.plist` or use `expo-build-properties`.
3. **Network**: The admin app and the backend must be on the same Wi-Fi network. Use the PC's local IP (e.g., `192.168.29.29:4000`).
4. **No real OTP**: In development, the OTP is always `111111`.
5. **Admin Role**: To make a user an admin, manually edit `db.json` and set their `role` to `"admin"`:
   ```json
   { "id": "...", "phone": "9999999999", "role": "admin", ... }
   ```
6. **Rate Limiting**: The backend has rate limiting. Don't make too many requests too fast.
7. **Token Expiry**: JWT tokens expire. Handle 401 errors by redirecting to the login screen.
8. **db.json is the source of truth**: All data reads and writes go through the API. Never edit `db.json` directly while the backend is running, as changes may be overwritten.

---

## 9. Quick Start for the Admin App

```
Instructions for Vibe Coding Agent:
1. Create a new Expo Go project: npx create-expo-app loanex-admin
2. Install axios: npx expo install axios
3. Install AsyncStorage: npx expo install @react-native-async-storage/async-storage
4. Install navigation: npx expo install @react-navigation/native @react-navigation/stack
5. Create an api.js file that sets the base URL and attaches the token to every request
6. Build the screens listed in Section 6 above
7. Use the endpoints from Section 3 and Section 4 for all data fetching
8. For admin-specific data (all orders, all users, KYC), add the endpoints from Section 7 to the backend first
```

**api.js base setup**:
```javascript
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://192.168.29.29:4000/api/v1'; // Change IP as needed

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

**Login flow**:
```javascript
// 1. Send OTP
await api.post('/auth/send-otp', { phone: '9999999999' });

// 2. Verify OTP (OTP is always 111111 in dev)
const res = await api.post('/auth/verify-otp', { phone: '9999999999', otp: '111111' });
const { token, user } = res.data.data;

// 3. Check role
if (user.role !== 'admin') throw new Error('Not an admin');

// 4. Store token
await AsyncStorage.setItem('adminToken', token);
```
