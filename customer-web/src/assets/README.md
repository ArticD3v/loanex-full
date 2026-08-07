# LoanEx Assets

Static assets served at `/assets` (configured in `angular.json`).

## Structure

| Folder | Responsibility |
|--------|----------------|
| `images/` | Product, marketing, and UI imagery |
| `icons/` | Custom SVG / icon assets (PrimeIcons covers icon font needs) |
| `fonts/` | Self-hosted web fonts |
| `mock/` | Front-end mock JSON / fixtures for local development only |

## Rules

- Do not place TypeScript, SCSS modules, or application logic here.
- Prefer optimized, production-ready assets before committing large binaries.
