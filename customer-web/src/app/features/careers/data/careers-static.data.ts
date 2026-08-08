import { CultureHighlight, WhyJoinCard } from '../models/careers.models';

/** Static marketing content for Careers page sections (not job listings). */
export const WHY_JOIN_CARDS: WhyJoinCard[] = [
  {
    id: 'growth',
    icon: 'pi pi-chart-line',
    title: 'Growth & Learning',
    description:
      'Stretch your skills with real product challenges, mentorship, and continuous learning support.',
  },
  {
    id: 'culture',
    icon: 'pi pi-users',
    title: 'Great Work Culture',
    description:
      'Collaborate with a respectful, ownership-driven team that values clarity, craft, and kindness.',
  },
  {
    id: 'opportunities',
    icon: 'pi pi-briefcase',
    title: 'Career Opportunities',
    description:
      'Build a long-term path across product, engineering, design, and go-to-market roles.',
  },
  {
    id: 'flexible',
    icon: 'pi pi-heart',
    title: 'Flexible & Supportive',
    description:
      'Balance ambitious goals with a supportive environment that respects your life outside work.',
  },
];

export const CULTURE_HIGHLIGHTS: CultureHighlight[] = [
  {
    id: 'customer',
    icon: 'pi pi-star',
    title: 'Customer-first mindset',
    description: 'We ship experiences that make EMI shopping simple, transparent, and trustworthy.',
  },
  {
    id: 'ownership',
    icon: 'pi pi-bolt',
    title: 'Ownership & impact',
    description: 'Small teams, clear goals, and the freedom to make meaningful product decisions.',
  },
  {
    id: 'together',
    icon: 'pi pi-comments',
    title: 'Learn together',
    description: 'Open feedback, design reviews, and knowledge sharing keep us growing as one team.',
  },
];
