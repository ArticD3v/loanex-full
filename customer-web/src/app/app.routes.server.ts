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
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
