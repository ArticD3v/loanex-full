# Styles (`src/styles`)

Global SCSS entry helpers. Design System lives in `src/theme`.

## Contents

| File | Responsibility |
|------|----------------|
| `vendor.css` | Tailwind, PrimeUI plugin, PrimeIcons, PrimeFlex |
| `_base.scss` | Document defaults using `--lx-*` tokens |
| `_utilities.scss` | Reserved; design utilities ship from `src/theme/utilities` |

Entry: `src/styles.scss` → `@use 'theme'` + base styles.
