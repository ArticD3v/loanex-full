# Application Root (src/app)

LoanEx Angular application root. Hosts bootstrap configuration, standalone routing, and the architectural layers below.

## Layers

| Folder | Responsibility |
|--------|----------------|
| `core/` | Singleton infrastructure: config, guards, interceptors, services, state |
| `shared/` | Reusable presentational building blocks with no feature ownership |
| `layout/` | Application chrome (shell, navbar, footer, auth layout) |
| `features/` | Lazy-loadable product domains |

## Rules

- Prefer standalone components, signals, and OnPush change detection.
- Feature areas own their routes for future `loadChildren` / `loadComponent` registration in `app.routes.ts`.
- Do not place business logic in the root `App` component.
