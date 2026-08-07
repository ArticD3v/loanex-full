# Layout / Breadcrumb

Reusable breadcrumb trail for the application shell.

## Usage

```html
<app-breadcrumb [items]="breadcrumbItems()" />
```

Driven by `LayoutUiService.breadcrumbItems` (or any `BreadcrumbItem[]` input). Hidden by the shell when only Home is present.
