# Environments

Build-time configuration for LoanEx across deployment targets.

## Files

| File | Purpose |
|------|---------|
| `environment.ts` | Production defaults |
| `environment.development.ts` | Local / development overrides |

## Rules

- Hold only configuration values (URLs, feature flags, app metadata).
- Do **not** place business logic, API clients, or secrets in these files.
- Wire new environments through `angular.json` `fileReplacements`.
