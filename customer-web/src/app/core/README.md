# Core

Application-wide infrastructure for LoanEx. Import from `@core/*`.

## Subfolders

| Folder | Responsibility |
|--------|----------------|
| `config/` | App-level configuration tokens and providers |
| `constants/` | Shared immutable constants |
| `guards/` | Route guards (functional preferred) |
| `interceptors/` | HTTP interceptors (functional preferred) |
| `models/` | Domain model classes / typed entities |
| `interfaces/` | Shared TypeScript interfaces and contracts |
| `services/` | Singleton injectable services |
| `state/` | Cross-feature application state (signals / stores) |

## Rules

- Core must remain feature-agnostic.
- No UI templates belong here.
- Provided once at the application root when services are introduced.
