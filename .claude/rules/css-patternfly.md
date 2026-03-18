---
description: CSS and PatternFly v6 styling conventions for ODH Dashboard
globs: "**/*.scss,**/*.css,**/*.tsx,**/*.ts"
alwaysApply: false
---

# CSS & PatternFly — ODH Dashboard

## PatternFly Version

This project uses **PatternFly v6** (`^6.4.0`). All class names, tokens, and APIs must target v6. Do not introduce v5 patterns.

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

### File format and co-location

- Use **SCSS** (`.scss`) for custom styles, co-located next to the component.
- No CSS modules — use plain class imports: `import './MyComponent.scss';`
- No styled-components or Emotion.

### Class composition with `css()`

Combine classes using `@patternfly/react-styles`:

```tsx
import { css } from '@patternfly/react-styles';

<div className={css('odh-my-component', isActive && 'm-active', className)} />
```

### PF utility classes — import style

Import PF utility CSS from `@patternfly/react-styles` rather than using raw `pf-v6-u-*` strings:

```tsx
import spacing from '@patternfly/react-styles/css/utilities/Spacing/spacing';
import text from '@patternfly/react-styles/css/utilities/Text/text';

<div className={spacing.mbLg} />
<span className={text.textColorStatusDanger} />
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

Follow the project's BEM-like convention with `odh-` prefix:

| Type | Pattern | Example |
|------|---------|---------|
| Block | `odh-{name}` | `odh-card`, `odh-list-item` |
| Element | `odh-{block}__{element}` | `odh-card__footer`, `odh-list-item__doc-text` |
| Modifier | `m-{modifier}` or `odh-m-{modifier}` | `m-disabled`, `m-is-selected`, `odh-m-doc` |
| Utility | `odh-u-{name}` | `odh-u-spin`, `odh-u-scrollable` |

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

Use PF component `breakpoint` props — do not write custom `@media` queries:

```tsx
<ToolbarToggleGroup breakpoint="md" toggleIcon={<FilterIcon />}>
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

Minimize inline styles. When needed for dynamic values, reference tokens:

```tsx
// Acceptable for dynamic/one-off values
style={{ gap: 'var(--pf-t--global--spacer--lg)' }}

// Avoid hardcoded pixel values
style={{ gap: '24px' }}
```
