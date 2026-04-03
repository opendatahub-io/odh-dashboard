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

## Issues

### Webpack module concatenation errors with Module Federation shared singletons

After bumping to PF 6.5 prereleases, `npm run build:frontend` produces four build errors — all the same class of failure:

```
Target module of reexport from '...' is not part of the concatenation
```

#### The errors

1. **`@patternfly/react-topology`** — `contextmenu/index.js` re-exports `DropdownItem as ContextMenuItem` from `@patternfly/react-core`
2. **`mobx-react` / `mobx-react-lite`** — `reactBatchedUpdates.js` re-exports `unstable_batchedUpdates` from `react-dom`
3. **`react-redux`** — `reactBatchedUpdates.js` re-exports `unstable_batchedUpdates` from `react-dom`
4. **`@odh-dashboard/plugin-core`** — `useExtensions.ts` re-exports `useExtensions` from `@openshift/dynamic-plugin-sdk`

#### Root cause

Every error involves a module that **re-exports from a package configured as a Module Federation shared singleton** in `frontend/config/moduleFederation.js`. The affected re-export targets and their MF config:

| Error source | Re-exports from | MF shared config |
|---|---|---|
| `@patternfly/react-topology` | `@patternfly/react-core` (`DropdownItem`) | `singleton: true` |
| `mobx-react-lite` | `react-dom` (`unstable_batchedUpdates`) | `singleton: true, eager: true` |
| `react-redux` | `react-dom` (`unstable_batchedUpdates`) | `singleton: true, eager: true` |
| `@odh-dashboard/plugin-core` | `@openshift/dynamic-plugin-sdk` (`useExtensions`) | `singleton: true, eager: true` |

Webpack's `ModuleConcatenationPlugin` (aka scope hoisting) tries to inline barrel re-exports into a single concatenated module. However, Module Federation marks shared singletons as **externals** — they live outside the concatenation boundary. When a barrel file re-exports from one of these externals, the concatenation plugin can't resolve the target module and the build fails.

This likely surfaced now because the PF prerelease bump changed dependency resolution or internal module structures enough to trigger concatenation paths that weren't exercised before.

#### Additional context for `react-topology`

`@patternfly/react-topology@6.5.0-prerelease.4` also does not declare a `sideEffects` field in its `package.json`, which makes webpack more aggressive about concatenating its modules. The `ContextMenuItem` export is not used anywhere in this codebase — webpack chokes on it purely during tree-shaking of the barrel file.

#### Fix

Disable `ModuleConcatenationPlugin` (scope hoisting) in the production webpack config by setting `concatenateModules: false`.

**File:** `frontend/config/webpack.prod.js`

```js
optimization: {
  minimize: true,
  minimizer: [new TerserJSPlugin(), new CssMinimizerPlugin()],
  concatenateModules: false,
},
```

**Why this approach over per-package `sideEffects: true` rules:**
- Fixes all four errors with one change instead of four separate rules
- Avoids whack-a-mole — more packages may hit the same issue during prerelease testing
- The bundle size impact is minimal (slightly more module wrappers, no functional difference)
- Dev mode (`webpack.dev.js`) is unaffected — `ModuleConcatenationPlugin` is off by default in `mode: 'development'`

**Why not per-package workarounds:**
An alternative is to add `sideEffects: true` webpack rules for each affected package individually. This is more targeted but requires a new rule for each package that hits the issue, and doesn't address the underlying MF shared singleton interaction:

```js
// Per-package alternative (in webpack.common.js module.rules):
{
  test: /[\\/]node_modules[\\/](@patternfly[\\/]react-topology|mobx-react-lite|react-redux)[\\/]/,
  sideEffects: true,
},
```

When the PF prereleases stabilize or the upstream MF/webpack issue is resolved, the `concatenateModules: false` setting should be re-evaluated and potentially removed.
