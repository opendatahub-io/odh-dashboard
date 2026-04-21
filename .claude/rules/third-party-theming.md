---
description: Theming external libraries (Perses, etc.) with PatternFly tokens in ODH Dashboard
globs: "packages/observability/**,packages/*/src/**/*theme*,packages/*/src/**/*Theme*"
alwaysApply: false
---

# Third-Party Library Theming — ODH Dashboard

Reference implementation: `packages/observability/src/perses/theme.ts`

For the MLflow federated UI theming approach (Emotion token translation + SCSS shell overrides), see the [MLflow fork](https://github.com/opendatahub-io/mlflow/tree/master/mlflow/server/js/src/common/styles/patternfly) — that pattern lives in the fork, not here.

---

## Invariant 1 — ECharts/canvas: use `.value`, not CSS vars

Canvas-based renderers cannot resolve CSS custom properties at paint time. Passing a `var(--pf-t--...)` string to an ECharts option or canvas `fillStyle` silently produces the wrong color.

```ts
import { t_color_white, t_color_gray_95 } from '@patternfly/react-tokens';

// Correct — resolved hex value
const textColor = isDark ? t_color_white.value : t_color_gray_95.value;

// These overrides are passed to generateChartsTheme(), not as top-level MUI theme properties
const chartsTheme = generateChartsTheme(muiTheme, {
  echartsTheme: {
    color: palette,               // hex array, never CSS var strings
    tooltip: {
      // CSS vars ARE fine for non-canvas properties (e.g. tooltip is DOM-rendered)
      backgroundColor: 'var(--pf-t--global--background--color--inverse--default)',
    },
  },
  thresholds: {
    defaultColor: textColor,      // .value, not .var
  },
});
```

Use `@patternfly/react-tokens` `.value` anywhere the value is consumed by a canvas renderer. Use `var(--pf-t--*)` strings everywhere else.

---

## Invariant 2 — Dark mode source: `useThemeContext()` only

Never infer dark mode from `prefers-color-scheme`, a local prop, or any source other than the dashboard theme context.

```ts
import { useThemeContext } from '@odh-dashboard/internal/app/ThemeContext';

const { theme: contextTheme } = useThemeContext();
const theme: PatternFlyTheme = contextTheme === 'dark' ? 'dark' : 'light';
```

The full theme object must recompute when context changes:

```ts
return React.useMemo(() => {
  const muiTheme = getTheme(theme, { ...mapPatternFlyThemeToMUI(theme) });
  // ... build chartsTheme ...
  return { muiTheme, chartsTheme };
}, [theme]);
```

---

## Invariant 3 — `ThemeProvider` at the library boundary, not the app root

Placing an MUI `ThemeProvider` at the app root leaks MUI styles into PF-only components. Scope it as close to the library's render boundary as possible.

```tsx
// Correct — scoped to the Perses render boundary
// packages/observability/src/perses/PersesWrapper.tsx
const { muiTheme, chartsTheme } = usePatternFlyTheme();
return (
  <ThemeProvider theme={muiTheme}>
    <ChartsProvider chartsTheme={chartsTheme}>
      {children}
    </ChartsProvider>
  </ThemeProvider>
);

// Wrong — app root wrapping bleeds MUI styles into unrelated PF components
// frontend/src/app/App.tsx
return <ThemeProvider theme={muiTheme}><App /></ThemeProvider>;
```

One wrapper component per external library. Never scatter `ThemeProvider` across individual pages.
