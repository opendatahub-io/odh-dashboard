# PatternFly Theme Testing Widget

A floating theme selector widget for designers and developers to toggle PatternFly v6 theme variants without editing code.

## What It Does

A small dropdown button appears fixed in the bottom-right corner of every page. It allows toggling three independent theme dimensions:

| Group | Options | CSS Class Applied |
|-------|---------|-------------------|
| **Color** | Light, Dark, System | `pf-v6-theme-dark` (via existing ThemeContext) |
| **Contrast** | Default, High contrast, Glass | `pf-v6-theme-high-contrast` / `pf-v6-theme-glass` |
| **Theme** | Default, Red Hat | `pf-v6-theme-redhat` |

All preferences persist in localStorage across sessions.

## Files

| File | Purpose |
|------|---------|
| `frontend/src/app/ThemeSelectorWidget.tsx` | The floating widget component |
| `frontend/src/app/ThemeSelectorWidget.scss` | Fixed positioning styles |
| `frontend/src/app/App.tsx` | Renders `<ThemeSelectorWidget />` (2 lines added) |

## How to Remove

When this temporary widget is no longer needed:

1. Delete `frontend/src/app/ThemeSelectorWidget.tsx`
2. Delete `frontend/src/app/ThemeSelectorWidget.scss`
3. In `frontend/src/app/App.tsx`:
   - Remove the import: `import ThemeSelectorWidget from './ThemeSelectorWidget';`
   - Remove the render: `<ThemeSelectorWidget />`

Users can also clear the localStorage keys if desired:
- `odh.dashboard.ui.contrast`
- `odh.dashboard.ui.pftheme`
- `odh.dashboard.ui.systemTheme`
