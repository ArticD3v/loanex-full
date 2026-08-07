import {
  CategoryItem,
  FooterSection,
  MockUser,
  NavItem,
  SocialLink,
} from '../models/layout.models';

/** Local mock data for the application shell (no APIs). */
export const LAYOUT_COMPANY = {
  name: 'LoanEx',
  tagline: 'Unlock Your Financial Freedom',
  logoSrc: 'assets/images/loanex-logo.png',
  logoAlt: 'LoanEx — Unlock Your Financial Freedom',
  description:
    'LoanEx is a premium FinTech shopping experience that helps you buy what you need with flexible EMI plans — clear pricing, transparent tenure, and a polished checkout journey.',
  email: 'hello@loanex.com',
  phone: '+91 1800 123 4567',
  address: 'Financial District, Bengaluru, India',
} as const;

export const DESKTOP_NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', path: '/' },
  { id: 'shop', label: 'Shop', path: '/products' },
  { id: 'categories', label: 'Categories', path: '/', fragment: 'categories' },
  { id: 'how-it-works', label: 'How It Works', path: '/', fragment: 'how-it-works' },
  { id: 'offers', label: 'Offers', path: '/', fragment: 'offers' },
  { id: 'support', label: 'Support', path: '/support' },
];

/** Primary navbar navigation (approved client menu). */
export const NAVBAR_NAV_ITEMS = DESKTOP_NAV_ITEMS;

export const MEGA_MENU_CATEGORIES: CategoryItem[] = [
  {
    id: 'smartphone',
    label: 'Smartphone',
    path: '/products',
    queryParams: { category: 'Smartphone' },
    icon: 'pi pi-mobile',
    description: 'Flagship mobiles on EMI',
  },
  {
    id: 'laptop',
    label: 'Laptop',
    path: '/products',
    queryParams: { category: 'Laptop' },
    icon: 'pi pi-desktop',
    description: 'Work and creator machines',
  },
  {
    id: 'smart-tv',
    label: 'Smart TV',
    path: '/products',
    queryParams: { category: 'Smart TV' },
    icon: 'pi pi-desktop',
    description: '4K and smart entertainment',
  },
  {
    id: 'refrigerator',
    label: 'Refrigerator',
    path: '/products',
    queryParams: { category: 'Refrigerator' },
    icon: 'pi pi-home',
    description: 'Frost-free & inverter fridges',
  },
  {
    id: 'washing-machine',
    label: 'Washing Machine',
    path: '/products',
    queryParams: { category: 'Washing Machine' },
    icon: 'pi pi-sync',
    description: 'Front load & top load washers',
  },
  {
    id: 'air-conditioner',
    label: 'Air Conditioner',
    path: '/products',
    queryParams: { category: 'Air Conditioner' },
    icon: 'pi pi-sun',
    description: 'Inverter split ACs',
  },
];

export const FOOTER_SECTIONS: FooterSection[] = [
  {
    id: 'quick',
    title: 'Quick Links',
    links: [
      { id: 'home', label: 'Home', path: '/' },
      { id: 'products', label: 'Products', path: '/products' },
      { id: 'categories', label: 'Categories', path: '/products' },
      { id: 'wishlist', label: 'Wishlist', path: '/wishlist' },
      { id: 'cart', label: 'Cart', path: '/cart' },
    ],
  },
  {
    id: 'support',
    title: 'Support',
    links: [
      { id: 'help', label: 'Help Center', path: '/support' },
      { id: 'orders', label: 'Track Orders', path: '/order/confirmation' },
      { id: 'contact', label: 'Contact Us', path: '/support' },
      { id: 'faq', label: 'FAQs', path: '/support' },
    ],
  },
  {
    id: 'emi',
    title: 'EMI Information',
    links: [
      { id: 'buy-emi', label: 'Buy on EMI', path: '/emi' },
      { id: 'my-emi', label: 'My EMI', path: '/my-emi' },
      { id: 'plans', label: 'EMI Plans', path: '/emi' },
      { id: 'eligibility', label: 'Eligibility', path: '/emi' },
    ],
  },
  {
    id: 'legal',
    title: 'Legal',
    links: [
      { id: 'privacy', label: 'Privacy Policy', path: '/support' },
      { id: 'terms', label: 'Terms of Use', path: '/support' },
      { id: 'refund', label: 'Refund Policy', path: '/support' },
      { id: 'grievance', label: 'Grievance Redressal', path: '/support' },
    ],
  },
];

export const SOCIAL_LINKS: SocialLink[] = [
  { id: 'instagram', label: 'Instagram', icon: 'pi pi-instagram', href: '#' },
  { id: 'twitter', label: 'X / Twitter', icon: 'pi pi-twitter', href: '#' },
  { id: 'linkedin', label: 'LinkedIn', icon: 'pi pi-linkedin', href: '#' },
  { id: 'youtube', label: 'YouTube', icon: 'pi pi-youtube', href: '#' },
];

export const MOCK_COUNTS = {
  cart: 0,
  wishlist: 0,
  notifications: 2,
} as const;

export const MOCK_USER: MockUser = {
  name: 'Aarav Mehta',
  email: 'aarav.mehta@email.com',
  initials: 'AM',
};

/** Path segment → breadcrumb label map for future routes. */
export const BREADCRUMB_LABELS: Record<string, string> = {
  products: 'Products',
  categories: 'Categories',
  wishlist: 'Wishlist',
  cart: 'Cart',
  checkout: 'Checkout',
  orders: 'Orders',
  profile: 'Profile',
  emi: 'EMI',
  notifications: 'Notifications',
  support: 'Support',
  search: 'Search',
  auth: 'Account',
};
