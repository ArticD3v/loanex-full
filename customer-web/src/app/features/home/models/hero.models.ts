export type CtaVariant = 'primary' | 'secondary' | 'outline' | 'ghost';

export interface HeroCta {
  id: string;
  label: string;
  path: string;
  variant: CtaVariant;
  icon?: string;
}

export interface HeroFeature {
  id: string;
  icon: string;
  title: string;
  description?: string;
}

export interface HeroBanner {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface HeroContent {
  titleLine1: string;
  titleLine2: string;
  description: string;
  ctas: HeroCta[];
  features: HeroFeature[];
  banner: HeroBanner;
}
