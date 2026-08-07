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

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'slide-1',
    badge: '🔥 Snapmint EMI Festival',
    titleLine1: 'Buy Latest Smartphones',
    titleLine2: 'On Easy EMI from ₹499/mo',
    description: '0 Down Payment. No Credit Card required. 100% digital KYC approval in 2 minutes.',
    image: 'https://images.unsplash.com/photo-1695048133142-1a204986d903?w=800&q=80',
    bgGradient: 'linear-gradient(135deg, #0a2e6f 0%, #1e40af 50%, #3b82f6 100%)',
    ctaText: 'Shop Smartphones',
    ctaPath: '/products',
    ctaQueryParams: { category: 'Smartphones' },
    secondaryCtaText: 'Check Eligibility',
    secondaryCtaPath: '/emi',
  },
  {
    id: 'slide-2',
    badge: '⚡ Work & Gaming Deals',
    titleLine1: 'Laptops & MacBooks',
    titleLine2: 'Pay in 3 to 24 Months',
    description: 'Top brands including Apple, HP, Dell & Lenovo. Zero processing fee options available.',
    image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80',
    bgGradient: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
    ctaText: 'Explore Laptops',
    ctaPath: '/products',
    ctaQueryParams: { category: 'Laptops' },
    secondaryCtaText: 'Calculate EMI',
    secondaryCtaPath: '/emi',
  },
  {
    id: 'slide-3',
    badge: '🏠 Home Appliances Special',
    titleLine1: 'Smart TVs & Refrigerators',
    titleLine2: 'Up to 40% OFF + 0% Interest',
    description: 'Upgrade your home with 4K TVs, Washing Machines & Inverter ACs on flexible monthly installments.',
    image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&q=80',
    bgGradient: 'linear-gradient(135deg, #065f46 0%, #047857 50%, #10b981 100%)',
    ctaText: 'Browse Appliances',
    ctaPath: '/products',
    ctaQueryParams: { category: 'Smart TV' },
    secondaryCtaText: 'View Offers',
    secondaryCtaPath: '/products',
  },
];

export const TRUST_HIGHLIGHTS = [
  { icon: 'pi pi-bolt', title: '2-Min Approval', desc: 'Instant Digital KYC' },
  { icon: 'pi pi-credit-card', title: 'No Credit Card', desc: 'Shop with Aadhaar & PAN' },
  { icon: 'pi pi-calendar', title: '3 to 24 Months EMI', desc: 'Flexible Monthly Plans' },
  { icon: 'pi pi-truck', title: 'Free Doorstep Delivery', desc: 'Fast & Secure Shipping' },
];
