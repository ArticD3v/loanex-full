# LoanEx

Premium FinTech + eCommerce platform foundation (Angular 20).

This repository currently contains **application foundation only** — no feature UI, pages, APIs, authentication, or business logic.

## Stack

- Angular 20 (standalone components & routing)
- TypeScript (strict mode)
- SCSS
- Angular Signals + RxJS
- SSR + client hydration
- Tailwind CSS
- PrimeNG / PrimeIcons / PrimeFlex
- Angular CDK
- Angular Animations

## Architecture

```
src/app
├── core/        # Config, guards, interceptors, services, state
├── shared/      # Reusable components, directives, pipes, utils, validators
├── layout/      # Navbar, footer, shell, auth-layout
└── features/    # Lazy-loadable domains (empty placeholders)
```

Path aliases: `@core/*`, `@shared/*`, `@layout/*`, `@features/*`, `@env/*`, `@theme/*`.

## Scripts

```bash
npm start          # ng serve (development)
npm run build      # production build with SSR
npm test           # unit tests
npm run serve:ssr:LoanEx  # serve SSR build
```

## Notes

- Routes are prepared for future lazy loading; none are registered yet.
- Environments live in `src/environments`.
- Global styles: `src/styles.scss` + `src/styles/` + Design System in `src/theme/`.
- Design System: tokens, utilities, pattern classes (`lx-*`), and PrimeNG `LoanExPreset`.
