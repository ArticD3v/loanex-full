# Theme / PrimeNG

LoanEx PrimeNG preset built on Aura via `definePreset`.

## File

- `loanex-preset.ts` — brand-aligned tokens for primary, surfaces, form fields, buttons, cards, chips, tags

## Wiring

Registered in `src/app/app.config.ts` through `providePrimeNG({ theme: { preset: LoanExPreset } })`.

## Brand mapping

| Design System | PrimeNG |
|---------------|---------|
| Primary `#0A2E6F` | `semantic.primary` + button primary |
| Primary Hover `#082455` | `primary.hoverColor` |
| Secondary `#D4A12A` | button secondary |
| Background `#F8FAFC` | surface 50 |
| Surface `#FFFFFF` | surface 0 |
| Border `#E5E7EB` | formField / content border |
| Text `#111827` / `#6B7280` | text tokens |
