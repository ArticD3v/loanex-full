export interface NavItem {
  id: string;
  label: string;
  path: string;
  fragment?: string;
  icon?: string;
  /** Active matching for nested routes (e.g. /careers/:id). Defaults to exact. */
  matchPaths?: 'exact' | 'subset';
}

export interface CategoryItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  description: string;
  queryParams?: Record<string, string>;
}

export interface FooterLink {
  id: string;
  label: string;
  /** Router path when the page exists. Omit when content is unavailable. */
  path?: string;
  /** When true, render as non-navigable unavailable text. */
  unavailable?: boolean;
}

export interface FooterSection {
  id: string;
  title: string;
  links: FooterLink[];
}

export interface SocialLink {
  id: string;
  label: string;
  icon: string;
  /** Absolute https URL only. Empty/missing = do not render. */
  href?: string;
}

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

export interface MockUser {
  name: string;
  email: string;
  initials: string;
}
