export interface HowItWorksStep {
  id: string;
  step: number;
  title: string;
  description: string;
  icon: string;
}

export interface OfferBannerContent {
  titleLine1: string;
  titleLine2: string;
  description: string;
  ctaLabel: string;
  ctaPath: string;
  imageSrc: string;
  imageAlt: string;
}

export interface WhyChooseCard {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}
