import { RenderMode, ServerRoute } from '@angular/ssr';

/** Seed product IDs from backend catalog — used for prerender only. */
const PRERENDER_PRODUCT_IDS = [
  'smartphone-iphone-15',
  'laptop-hp-pavilion-15',
  'smart-tv-samsung-55',
  'refrigerator-lg-260',
  'washing-machine-bosch-7kg',
  'ac-voltas-1-5ton',
  'tablet-samsung-s9',
  'smartwatch-apple-series-9',
] as const;

export const serverRoutes: ServerRoute[] = [
  {
    // Home must run in the browser so product/banner APIs fire after hydration.
    // Prerender + takeUntilDestroyed was cancelling subscriptions before client boot.
    path: '',
    renderMode: RenderMode.Client,
  },
  {
    path: 'products/:productId',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return PRERENDER_PRODUCT_IDS.map((productId) => ({ productId }));
    },
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
