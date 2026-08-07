export interface NavItem {
  id: string;
  label: string;
  path: string;
  fragment?: string;
  icon?: string;
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
  path: string;
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
  href: string;
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
