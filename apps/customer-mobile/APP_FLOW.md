# Customer App Complete Flow (Finance + E-Commerce Hybrid)

## 1. APP OPEN FLOW
User opens app.
- Splash Screen
- Check User Session
- Is User Logged In?
  - If Already Logged In -> Home Dashboard
  - If New User -> Login / Signup Screen

## 2. LOGIN / SIGNUP FLOW
**Login Screen**
- Fields: Mobile Number
- Button: Continue

**OTP Verification Screen** (Currently dummy verification)
- User enters mobile number -> Enter OTP
- Backend checks OTP:
  - OTP = 0000 -> Redirect Admin Dashboard
  - OTP = 1111 -> Redirect Customer App
  - Any other OTP -> Invalid OTP

## 3. NEW USER PROFILE CREATION
After customer OTP verification, Backend checks if user profile exists.
- **Existing User**: Direct to Home Screen
- **New User**: Show Complete Profile Screen
  - Required Fields: Full Name, Mobile Number
  - Optional Fields: Email, Date Of Birth, Gender, Profile Picture
  - Button: Create Account -> Customer Home Dashboard

## 4. CUSTOMER HOME DASHBOARD
After login user can Browse Products.
- Sections: Banner Slider, Categories, Featured Products, Trending Products, Recommended Products, Recently Viewed Products

## 5. PRODUCT DISCOVERY FLOW
- **Option 1 (Search)**: Search Product -> Search Result -> Product Listing -> Product Details
- **Option 2 (Category)**: Home -> Category -> Sub Category -> Products -> Product Details

## 6. PRODUCT DETAILS SCREEN
- **Product Information**: Product Images, Name, Brand, Description, Specifications, Price, GST Included Price, Warranty, Stock Availability
- **Product Variant Selection**: Color, Storage, etc. (Updates Price, Images, Stock, EMI Availability)
- **Purchase Options**: Buy Now, Buy On EMI, Add To Cart

## 7. PURCHASE OPTIONS

### FLOW A: DIRECT PURCHASE (Buy Now)
- **Step 1: Check Address**
  - Existing Address: Show Saved Addresses (Home, Office, Other). User selects and continues.
  - No Address: Show Add Address (Name, Mobile, House No, Street, Area, City, State, Pincode). Save and continue.
- **Step 2: KYC Verification** (Required before payment)
  - Aadhaar Verification (Enter Aadhaar -> API Check)
  - PAN Verification (Enter PAN -> API Check)
  - Face Verification (Camera Permission -> Capture Face -> Match -> Complete)
  - Status updated to `kyc_completed`
- **Step 3: Payment**
  - Redirect to Razorpay Payment Gateway (UPI, Cards, Net Banking, Wallets)
  - Payment Success -> Create Order -> Show Order Confirmation
  - Payment Failed -> Retry Payment
- **Step 4: Order Creation**
  - Saved with: Order ID, User ID, Product ID, Variant ID, Quantity, Price, GST, Payment Status, Delivery Address, Order Status
  - Initial Status: Order Placed

### FLOW B: CART PURCHASE
- Add To Cart -> Cart Screen (Products, Variants, Quantity, Price, Total Amount) -> Proceed Checkout
- Flow: Cart -> Address -> KYC Check -> Razorpay -> Order Created -> Orders Tab

### FLOW C: EMI PURCHASE (Buy On EMI)
- **Step 1: Address Check** (Same as Direct)
- **Step 2: KYC Verification** (Required: Aadhaar, PAN, Face)
- **Step 3: EMI Plan Selection**
  - Shows Down Payment, Monthly EMI, Duration for various plans.
  - Customer selects EMI Plan.
- **Step 4: EMI Application Creation**
  - Instead of immediate payment, create EMI Request.
  - Status: Pending Admin Review
  - Customer sees: Application Submitted, Waiting For Approval

## 8. CUSTOMER ORDER SECTION
- **Orders Tab**: All Orders
- **Order Card**: Image, Name, Order ID, Amount, Status
- **Order Detail**: Product Details, Payment Details, Delivery Address, Invoice, Tracking
- **Order Status Flow**: Order Placed -> Payment Confirmed -> Processing -> Packed -> Shipped -> Out For Delivery -> Delivered

## 9. EMI SECTION IN PROFILE
- **View**: My EMI Applications, Active EMI, Pending Applications, Approved EMI, Rejected EMI
- **Each EMI Shows**: Product, EMI Amount, Duration, Next Due Date, Payment History

## 10. CUSTOMER PROFILE
- Sections: My Profile, My Orders, My EMI, Saved Addresses, KYC Status, Wishlist, Notifications, Help & Support, Logout

## DATABASE USER FLOW LOGIC
- **users**: id, mobile_number, name, email, role (customer/admin), created_at
- **user_kyc**: user_id, aadhaar_number, pan_number, face_verified, kyc_status
- **user_addresses**: id, user_id, name, mobile, address, city, state, pincode, type
- **orders**: id, user_id, product_id, payment_type, payment_status, order_status, amount, address_id
- **emi_applications**: id, user_id, product_id, plan_id, kyc_status, application_status, admin_review_status
