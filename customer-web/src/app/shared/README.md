# Shared

Reusable, presentational building blocks with no knowledge of LoanEx product domains. Import from `@shared/*`.

## Subfolders

| Folder | Responsibility |
|--------|----------------|
| `components/` | Dumb / presentational standalone components |
| `directives/` | Standalone directives |
| `pipes/` | Standalone pipes |
| `utils/` | Pure helper functions |
| `validators/` | Reactive-forms validators |

## Rules

- Shared code must not import from `features/`.
- No feature-specific business logic.
- Prefer inputs/outputs and signals for component APIs.
