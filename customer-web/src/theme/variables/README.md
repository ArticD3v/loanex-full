# Theme / Variables

Compile-time SCSS tokens for the LoanEx Design System (`$lx-*`).

## Responsibility

- Single source for Sass math, maps, and mixins
- Mirrored at runtime as CSS custom properties under `:root`

## Rules

- Prefer CSS variables in component/feature SCSS when values must theme at runtime
- Use `$lx-*` only inside `src/theme` mixins and pattern files
- Do not hard-code brand colors outside this layer
