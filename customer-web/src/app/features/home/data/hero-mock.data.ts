export interface HeroSlide {
  id: string;
  badge: string;
  titleLine1: string;
  titleLine2: string;
  description: string;
  image: string;
  bgGradient: string;
  ctaText: string;
  ctaPath: string;
  ctaQueryParams?: Record<string, string>;
  secondaryCtaText: string;
  secondaryCtaPath: string;
}

/** Hero slides come from the banners API — no static catalog. */
export const HERO_SLIDES: HeroSlide[] = [];

export const TRUST_HIGHLIGHTS = [
  { icon: 'pi pi-bolt', title: '2-Min Approval', desc: 'Instant Digital KYC' },
  { icon: 'pi pi-credit-card', title: 'No Credit Card', desc: 'Shop with Aadhaar & PAN' },
  { icon: 'pi pi-calendar', title: 'Flexible EMI', desc: 'Plans from product config' },
  { icon: 'pi pi-truck', title: 'Free Doorstep Delivery', desc: 'Fast & Secure Shipping' },
];
