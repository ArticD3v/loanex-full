import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    // Home must run in the browser so product/banner APIs fire after hydration.
    // Prerender + takeUntilDestroyed was cancelling subscriptions before client boot.
    path: '',
    renderMode: RenderMode.Client,
  },
  {
    // Shop listing must match Home: CSR so catalog (and Shell cart/wishlist) APIs
    // run on refresh. Prerender via `**` left /products hydrating with cancelled work.
    path: 'products',
    renderMode: RenderMode.Client,
  },
  {
    // PDP also loads product + related (+ wishlist) via takeUntilDestroyed; same
    // prerender cancellation bug as Home/Shop on hard refresh.
    path: 'products/:productId',
    renderMode: RenderMode.Client,
  },
  {
    path: 'orders/:orderId',
    renderMode: RenderMode.Client,
  },
  {
    path: 'my-orders/:orderId',
    renderMode: RenderMode.Client,
  },
  {
    path: 'my-emi/pay/:emiId',
    renderMode: RenderMode.Client,
  },
  {
    // Careers loads jobs/applications via HTTP + takeUntilDestroyed.
    // Prerender cancelled those subscriptions on hard refresh (no API call).
    path: 'careers',
    renderMode: RenderMode.Client,
  },
  {
    path: 'careers/**',
    renderMode: RenderMode.Client,
  },
  {
    // Auth-guarded checkout must run in the browser: prerender has no localStorage,
    // so AuthGuard would redirect to login on hard refresh before client hydration.
    path: 'checkout',
    renderMode: RenderMode.Client,
  },
  {
    path: 'checkout/**',
    renderMode: RenderMode.Client,
  },
  {
    // Same auth/localStorage hard-refresh issue as checkout.
    path: 'profile',
    renderMode: RenderMode.Client,
  },
  {
    path: 'profile/**',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
