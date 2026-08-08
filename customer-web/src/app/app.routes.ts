import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { AuthLayout } from './layout/auth-layout/auth-layout';
import { Shell } from './layout/shell/shell';

/**
 * LoanEx application routes.
 */
export const routes: Routes = [
  {
    path: '',
    component: Shell,
    children: [
      {
        path: '',
        loadComponent: () => import('./features/home/home').then((m) => m.Home),
        title: 'LoanEx — Shop What You Need. Pay in Easy EMIs.',
      },
      {
        path: 'products',
        loadChildren: () =>
          import('./features/products/products.routes').then((m) => m.PRODUCTS_ROUTES),
      },
      {
        path: 'checkout',
        loadChildren: () =>
          import('./features/checkout/checkout.routes').then((m) => m.CHECKOUT_ROUTES),
      },
      {
        path: 'cart',
        loadChildren: () =>
          import('./features/cart/cart.routes').then((m) => m.CART_ROUTES),
      },
      {
        path: 'wishlist',
        loadChildren: () =>
          import('./features/wishlist/wishlist.routes').then((m) => m.WISHLIST_ROUTES),
      },
      {
        path: 'my-orders',
        loadChildren: () =>
          import('./features/orders/orders.routes').then((m) => m.ORDERS_ROUTES),
      },
      {
        path: 'my-orders/:orderId',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/orders/pages/order-details/order-details').then(
            (m) => m.OrderDetailsComponent,
          ),
        title: 'Order Details — LoanEx',
      },
      {
        path: 'orders',
        pathMatch: 'full',
        redirectTo: 'my-orders',
      },
      {
        path: 'support',
        loadChildren: () =>
          import('./features/support/support.routes').then((m) => m.SUPPORT_ROUTES),
      },
      {
        path: 'careers',
        loadChildren: () =>
          import('./features/careers/careers.routes').then((m) => m.CAREERS_ROUTES),
      },
      {
        path: 'profile',
        loadChildren: () =>
          import('./features/profile/profile.routes').then((m) => m.PROFILE_ROUTES),
      },
      {
        path: 'verification',
        loadChildren: () =>
          import('./features/verification/verification.routes').then(
            (m) => m.VERIFICATION_ROUTES,
          ),
      },
      {
        path: 'mobile-verification',
        redirectTo: '/verification',
        pathMatch: 'full',
      },
      {
        path: 'aadhaar-verification',
        redirectTo: '/verification',
        pathMatch: 'full',
      },
      {
        path: 'pan-verification',
        redirectTo: '/verification',
        pathMatch: 'full',
      },
      {
        path: 'bank-verification',
        redirectTo: '/verification',
        pathMatch: 'full',
      },
      {
        path: 'application/pending',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/emi/pages/pending-review/pending-review').then(
            (m) => m.PendingReviewComponent,
          ),
        title: 'Application Pending Review — LoanEx',
      },
      {
        path: 'application/approved',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/emi/pages/approved-loan-offer/approved-loan-offer').then(
            (m) => m.ApprovedLoanOfferComponent,
          ),
        title: 'Approved Loan Offer — LoanEx',
      },
      {
        path: 'application/rejected',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/emi/pages/application-rejected/application-rejected').then(
            (m) => m.ApplicationRejectedComponent,
          ),
        title: 'Application Rejected — LoanEx',
      },
      {
        path: 'application/down-payment',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/emi/pages/down-payment/down-payment').then(
            (m) => m.DownPaymentComponent,
          ),
        title: 'Down Payment — LoanEx',
      },
      {
        path: 'application/order-confirmation',
        redirectTo: '/order/confirmation',
        pathMatch: 'full',
      },
      {
        path: 'order/confirmation',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/emi/pages/order-confirmation/order-confirmation').then(
            (m) => m.OrderConfirmationComponent,
          ),
        title: 'Order Confirmation — LoanEx',
      },
      {
        path: 'orders/:orderId',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/orders/pages/order-details/order-details').then(
            (m) => m.OrderDetailsComponent,
          ),
        title: 'Order Details — LoanEx',
      },
      {
        path: 'my-emi',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/emi/pages/my-emi/my-emi').then((m) => m.EmiDashboardComponent),
        title: 'My EMI — LoanEx',
      },
      {
        path: 'my-emis',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/emi/pages/my-emis/my-emis').then((m) => m.MyEmisComponent),
        title: 'My EMIs — LoanEx',
      },
      {
        path: 'my-emi/pay/:emiId',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/emi/pages/emi-payment/emi-payment').then(
            (m) => m.EmiPaymentComponent,
          ),
        title: 'Pay EMI — LoanEx',
      },
      {
        path: 'my-emi/payment-history',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/emi/pages/payment-history/payment-history').then(
            (m) => m.PaymentHistoryComponent,
          ),
        title: 'Payment History — LoanEx',
      },
      {
        path: 'my-emi/statement',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/emi/pages/loan-statement/loan-statement').then(
            (m) => m.LoanStatementComponent,
          ),
        title: 'Loan Statement — LoanEx',
      },
      {
        path: 'my-emi/autopay',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/emi/pages/autopay/autopay').then((m) => m.AutopayComponent),
        title: 'AutoPay — LoanEx',
      },
      {
        path: 'notifications',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/notifications/pages/notification-center/notification-center').then(
            (m) => m.NotificationCenterComponent,
          ),
        title: 'Notifications — LoanEx',
      },
      {
        path: 'emi',
        pathMatch: 'full',
        redirectTo: 'verification',
      },
      {
        path: 'emi/pending-review',
        redirectTo: '/application/pending',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: 'auth',
    component: AuthLayout,
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
