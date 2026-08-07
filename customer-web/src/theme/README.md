# LoanEx Design System (`src/theme`)

Enterprise design tokens, utilities, and visual patterns for the LoanEx FinTech + eCommerce platform.

**This layer is CSS/SCSS + PrimeNG theme configuration only.** No pages, navbar, footer, or Angular components.

## Structure

```
theme/
├── variables/     # SCSS $lx-* compile-time tokens
├── colors/        # Brand + semantic CSS custom properties
├── typography/    # Type scale + role classes
├── spacing/       # 4–64 spacing tokens
├── radius/        # sm → pill radii
├── shadows/       # Elevation shadows
├── animations/    # Keyframes + transition tokens
├── mixins/        # Breakpoints, focus, elevation helpers
├── utilities/     # Utility / helper / responsive classes
├── patterns/      # Buttons, inputs, cards, badges, chips, loaders, empty states
└── primeng/       # LoanExPreset (Aura) TypeScript theme
```

## Conventions

- Prefix: `lx-` (classes) / `--lx-*` (CSS vars) / `$lx-*` (SCSS)
- Prefer tokens over hard-coded values
- Patterns are style classes for future components — not components themselves

## Entry

Loaded via `@use 'theme';` from `src/styles.scss` (include path: `src`).
