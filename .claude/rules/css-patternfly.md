---
description: CSS and PatternFly v6 styling conventions for ODH Dashboard
globs: "**/*.scss,**/*.css,**/*.tsx,**/*.ts"
alwaysApply: false
---

# CSS & PatternFly — ODH Dashboard

## PatternFly Version

This project uses **PatternFly v6** (`^6.4.1`). All class names, tokens, and APIs must target v6. Do not introduce v5 patterns.

## Component Imports

Use barrel imports from top-level PF packages:

```tsx
// Correct
import { Button, Modal, ModalBody, ModalHeader, ModalFooter } from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { ExclamationCircleIcon } from '@patternfly/react-icons';

// Avoid deep paths (only acceptable for custom icons via createIcon)
import { createIcon } from '@patternfly/react-icons/dist/esm/createIcon';
```

## Styling Approach

The majority of Dashboard components should use PatternFly components and props directly with no custom CSS. Anything requiring custom or inline styles should ideally be addressed as a gap upstream.

### Priority order

1. **PatternFly component props first** — always the default approach
2. **PF layout components** (`Flex`, `Stack`, `Grid`, `Split`, `Gallery`) for spacing and arrangement
3. **PF utility classes** (`pf-v6-u-*`) when props and layout components are insufficient
4. **SCSS with PF tokens only** when PF has no built-in functionality — must use `var(--pf-t--*)` tokens, not hardcoded values. Open a PF upstream issue if something fundamental is missing.

### File format and co-location

When SCSS is necessary:

- Use **SCSS** (`.scss`) for custom styles, co-located next to the component.
- No CSS modules — use plain class imports: `import './MyComponent.scss';`
- No styled-components or Emotion.

### PF utility classes

PF utility classes (`pf-v6-u-*`) are available globally via the `@patternfly/patternfly/patternfly-addons.css` import in `App.tsx`. Use them as raw strings in `className` — no per-file imports from `@patternfly/react-styles` needed:

```tsx
<div className="pf-v6-u-mb-lg pf-v6-u-w-100" />
```

## Design Tokens

Always use PF **semantic tokens** (`--pf-t--*`) for colors, spacing, fonts, and borders. Never use palette tokens (tokens ending in a number like `--50`) unless defining project-level custom variables.

```scss
// Correct — semantic tokens
padding: var(--pf-t--global--spacer--md);
color: var(--pf-t--global--text--color--regular);
border: 1px solid var(--pf-t--global--border--color--default);

// Avoid — hardcoded values
padding: 16px;
color: #333;
```

### Custom project variables

Project-specific variables use the `--ai-*` prefix and are defined in `frontend/src/concepts/design/vars.scss`. They reference PF tokens and support dark theme via `:root:where(.pf-v6-theme-dark)`. Use these for domain-specific theming (e.g., `--ai-serving--Color`, `--ai-training--BorderColor`).

### React tokens

When you need a token value in JS, import from `@patternfly/react-tokens`:

```tsx
import { t_global_spacer_xs } from '@patternfly/react-tokens';
// t_global_spacer_xs.var → "var(--pf-t--global--spacer--xs)"
// t_global_spacer_xs.value → "0.5rem"
```

## Custom Class Naming

Follow the project's BEM-like convention. Custom block-level classes must be namespaced with a prefix to avoid collisions:

- **`frontend/src/`** — use the `odh-` prefix.
- **`packages/*/`** — use a consistent package-specific prefix (e.g., `autorag-`, `automl-`, `fs-`). The `odh-` prefix is also acceptable for shared/cross-cutting components.

| Type | Pattern | Example |
|------|---------|---------|
| Block | `odh-{name}` | `odh-card`, `odh-list-item` |
| Element | `odh-{block}__{element}` | `odh-card__footer`, `odh-list-item__doc-text` |
| Modifier | `m-{modifier}` or `odh-m-{modifier}` | `m-disabled`, `m-is-selected`, `odh-m-doc` |
| Utility | `odh-u-{name}` | `odh-u-scrollable` |
| Shared utility | `ai-u-{name}` | `ai-u-spin` (from mod-arch-shared) |

## PF Component Overrides

Override PF styles using **component CSS variables** — not `!important` (unless working around a known bug with a TODO comment):

```scss
// Correct — override via component variable
.my-context .pf-v6-c-card {
  --pf-v6-c-card--BorderColor: var(--border-color);
}

// Avoid — specificity wars
.my-context .pf-v6-c-card {
  border-color: red !important;
}
```

When overriding PF bugs, always add a TODO with the upstream issue link:

```scss
// TODO: Remove when PF bug is fixed. See https://github.com/patternfly/patternfly-react/issues/XXXX
.pf-v6-c-drawer__body {
  min-height: 0;
}
```

## Common PF Patterns

### Tables — composable API

Use the composable table API from `@patternfly/react-table`. Use the project's `Table`/`TableBase` wrappers for pagination and sorting:

```tsx
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
```

### Modals

Use `Modal` + `ModalHeader` / `ModalBody` / `ModalFooter` with `DashboardModalFooter`:

```tsx
<Modal isOpen={isOpen} onClose={onClose} variant="small">
  <ModalHeader title="Confirm" />
  <ModalBody>Are you sure?</ModalBody>
  <ModalFooter>
    <DashboardModalFooter submitLabel="Confirm" onSubmit={handleSubmit} onCancel={onClose} />
  </ModalFooter>
</Modal>
```

### Empty states

```tsx
<EmptyState variant={EmptyStateVariant.lg} icon={SearchIcon} headingLevel="h2" titleText="No results">
  <EmptyStateBody>Adjust your filters.</EmptyStateBody>
  <EmptyStateFooter>
    <EmptyStateActions><Button onClick={onClear}>Clear filters</Button></EmptyStateActions>
  </EmptyStateFooter>
</EmptyState>
```

### Layout

Prefer PF layout components over raw CSS flex/grid:

| Need | Component |
|------|-----------|
| Vertical stack | `Stack` / `StackItem` with `hasGutter` |
| Horizontal row | `Flex` / `FlexItem` with `spaceItems` |
| Card grid | `Gallery` / `GalleryItem` with `minWidths` |
| Two-column split | `Split` / `SplitItem` |
| Grid layout | `Grid` / `GridItem` |

### Responsive design

PF components handle responsive behavior through their own breakpoint-aware props — the API varies per component. Do not write custom @media queries.

```tsx
// Flex — responsive direction
<Flex direction={{ default: 'column', md: 'row' }}>

// Grid — responsive columns
<GridItem sm={12} md={6} lg={4}>

// DescriptionList — responsive columns
<DescriptionList columnModifier={{ lg: '3Col' }}>

// Th — responsive visibility
<Th visibility={['hiddenOnMd', 'visibleOnLg']}>
```

## PF Wrapper Components

The project provides custom wrappers. Use them instead of raw PF equivalents:

| Wrapper | Location | Use instead of |
|---------|----------|----------------|
| `FormSection` | `components/pf-overrides/FormSection` | PF `FormSection` (adds description support) |
| `DashboardModalFooter` | `concepts/dashboard/DashboardModalFooter` | Manual modal footer buttons |
| `DashboardEmptyTableView` | `concepts/dashboard/DashboardEmptyTableView` | Manual empty table states |
| `Table` / `TableBase` | `components/table/` | Raw PF table (adds pagination, sorting) |
| `DeleteModal` | `pages/projects/components/DeleteModal` | Custom delete confirmations |

## Inline Styles

**Avoid inline styles.** They are brittle, bypass the design token system, break dark mode support, and are not reusable. Always prefer PatternFly component props and layout components instead.

If an inline style seems necessary, first check whether a PF component prop, layout component, or utility class can achieve the same result. If truly unavoidable for a dynamic value, reference tokens — never hardcode values:

```tsx
// Last resort for dynamic values — reference tokens
style={{ gap: 'var(--pf-t--global--spacer--lg)' }}

// Never do this
style={{ gap: '24px' }}
```
