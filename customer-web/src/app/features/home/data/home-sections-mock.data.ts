import {
  FaqItem,
  HowItWorksStep,
  OfferBannerContent,
  WhyChooseCard,
} from '../models/home-sections.models';

/** Local mock data for remaining Home sections (no APIs). */

export const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
  {
    id: 'choose',
    step: 1,
    title: 'Choose Product',
    description: 'Browse categories and pick the product that fits your needs.',
    icon: 'pi pi-shopping-bag',
  },
  {
    id: 'verify',
    step: 2,
    title: 'Verify Details',
    description: 'Complete a quick digital KYC with your mobile and ID proofs.',
    icon: 'pi pi-id-card',
  },
  {
    id: 'emi',
    step: 3,
    title: 'Select EMI Plan',
    description: 'Compare tenures and choose an EMI plan that suits your budget.',
    icon: 'pi pi-wallet',
  },
  {
    id: 'delivery',
    step: 4,
    title: 'Get Delivery',
    description: 'Pay your down payment and get the product delivered to your door.',
    icon: 'pi pi-truck',
  },
];

export const OFFER_BANNER: OfferBannerContent = {
  titleLine1: 'Exciting Offers.',
  titleLine2: 'Bigger Benefits.',
  description:
    'Unlock exclusive EMI deals, festive discounts, and zero-cost plans on top brands — limited-time savings designed for smarter shopping.',
  ctaLabel: 'Explore Offers',
  ctaPath: '/products',
  imageSrc: 'assets/images/offer-gift.webp',
  imageAlt: 'Gift box illustration for LoanEx promotional offers',
};

export const WHY_CHOOSE_CARDS: WhyChooseCard[] = [
  {
    id: 'convenience',
    title: 'Instant Convenience',
    description: 'Shop in minutes with a seamless checkout and fast digital approval.',
    icon: 'pi pi-bolt',
  },
  {
    id: 'range',
    title: 'Wide Product Range',
    description: 'From mobiles to furniture — explore thousands of everyday essentials.',
    icon: 'pi pi-th-large',
  },
  {
    id: 'flexible',
    title: 'Flexible EMI Options',
    description: 'Pick tenure and down payment options that match your monthly budget.',
    icon: 'pi pi-sliders-h',
  },
  {
    id: 'trusted',
    title: 'Trusted by Thousands',
    description: 'Join customers who rely on LoanEx for transparent, secure EMI shopping.',
    icon: 'pi pi-users',
  },
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-1',
    question: 'Do I need a credit card to shop on LoanEx?',
    answer:
      'No. LoanEx lets you shop on EMI without a credit card. You can complete verification using your mobile number and basic identity documents.',
  },
  {
    id: 'faq-2',
    question: 'How long does EMI eligibility verification take?',
    answer:
      'Most customers receive a decision within a few minutes after submitting their details. In some cases, verification may take up to 24 working hours.',
  },
  {
    id: 'faq-3',
    question: 'What documents are required for KYC?',
    answer:
      'Typically you need a valid Aadhaar, PAN, and an active bank account for repayment. Exact requirements may vary based on the product and EMI plan.',
  },
  {
    id: 'faq-4',
    question: 'Can I choose my own EMI tenure?',
    answer:
      'Yes. After selecting a product, you can compare available tenures and choose the EMI plan that best fits your monthly budget.',
  },
  {
    id: 'faq-5',
    question: 'Are there any hidden charges on EMI purchases?',
    answer:
      'LoanEx shows clear pricing before you confirm. Any processing fee or interest applicable to your plan is displayed upfront during checkout.',
  },
  {
    id: 'faq-6',
    question: 'How do I repay my EMI each month?',
    answer:
      'EMIs are auto-debited from your registered bank account or paid via UPI as per the repayment schedule shared after approval.',
  },
  {
    id: 'faq-7',
    question: 'Can I cancel or return a product bought on EMI?',
    answer:
      'Returns follow the product’s return policy. If a return is approved, your EMI plan is adjusted or cancelled according to the refund timeline.',
  },
  {
    id: 'faq-8',
    question: 'Is my personal and payment data secure?',
    answer:
      'Yes. LoanEx uses bank-grade encryption and secure verification flows to protect your personal, KYC, and payment information.',
  },
];
