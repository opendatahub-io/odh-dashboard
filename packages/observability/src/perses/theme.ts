import React from 'react';
import { Theme, ThemeOptions } from '@mui/material';

// Extend MUI theme to include x-date-pickers components
declare module '@mui/material/styles' {
  interface Components {
    MuiPickersDay?: object;
    MuiClock?: object;
    MuiClockPointer?: object;
    MuiClockNumber?: object;
  }
}
import { ChartThemeColor, getThemeColors } from '@patternfly/react-charts/victory';
import {
  generateChartsTheme,
  getTheme,
  PersesChartsTheme,
  typography,
} from '@perses-dev/components';
import {
  t_color_gray_95,
  t_color_white,
  t_global_color_brand_default,
  t_global_color_brand_hover,
  t_global_spacer_md,
} from '@patternfly/react-tokens';
import { useThemeContext } from '@odh-dashboard/internal/app/ThemeContext';

// Override eChart defaults with PatternFly colors.
const patternflyBlue300 = '#2b9af3';
const patternflyBlue400 = '#0066cc';
const patternflyBlue500 = '#004080';
const patternflyBlue600 = '#002952';
const defaultPaletteColors = [patternflyBlue400, patternflyBlue500, patternflyBlue600];

const chartColorScale = getThemeColors(ChartThemeColor.multiUnordered).chart?.colorScale;
const patternflyChartsMultiUnorderedPalette = Array.isArray(chartColorScale)
  ? chartColorScale.flatMap((cssColor) => {
      // colors stored as 'var(--pf-chart-theme--multi-color-unordered--ColorScale--3400, #73c5c5)'
      // need to extract the hex value, because fillStyle() of <canvas> does not support CSS vars
      const match = cssColor.match(/#[a-fA-F0-9]+/);
      return match ? [match[0]] : [];
    })
  : [];

type PatternFlyTheme = 'light' | 'dark';

const mapPatterflyThemeToMUI = (theme: PatternFlyTheme): ThemeOptions => {
  const isDark = theme === 'dark';
  const primaryTextColor = isDark ? t_color_white.value : t_color_gray_95.value;
  const primaryBackgroundColor = 'var(--pf-t--global--background--color--primary--default)';

  return {
    typography: {
      ...typography,
      fontFamily: 'var(--pf-t--global--font--family--body)',
      subtitle1: {
        // Card Heading
        fontFamily: 'var(--pf-t--global--font--family--heading)',
        fontWeight: 'var(--pf-t--global--font--weight--heading--default)',
        lineHeight: 'var(--pf-v6-c-card__title-text--LineHeight)',
        fontSize: 'var(--pf-t--global--font--size--heading--sm)',
      },
      h2: {
        // Panel Group Heading
        color: 'var(--pf-t--global--text--color--regular)',
        fontFamily: 'var(--pf-t--global--font--family--heading)',
        fontWeight: 'var(--pf-t--global--font--weight--heading--default)',
        fontSize: 'var(--pf-t--global--font--size--600)',
      },
    },
    palette: {
      primary: {
        // Maps to PatternFly brand tokens: default, hover, clicked
        light: t_global_color_brand_default.value,
        main: t_global_color_brand_default.value,
        dark: t_global_color_brand_hover.value, // MUI uses 'dark' for hover
        contrastText: t_color_white.value,
      },
      secondary: {
        main: primaryTextColor,
        light: primaryTextColor,
        dark: primaryTextColor,
      },
      background: {
        default: primaryBackgroundColor,
        paper: primaryBackgroundColor,
      },
      text: {
        primary: primaryTextColor,
        secondary: primaryTextColor,
        disabled: primaryTextColor,
      },
    },
    components: {
      MuiTypography: {
        styleOverrides: {
          root: {
            // Custom Time Range Selector
            '&.MuiClock-meridiemText': {
              color: primaryTextColor,
            },
          },
        },
      },
      MuiSvgIcon: {
        styleOverrides: {
          root: {
            color: theme === 'dark' ? t_color_white.value : t_color_gray_95.value,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 'var(--pf-t--global--border--radius--medium)',
            borderColor: 'var(--pf-t--global--border--color--default)',
          },
        },
      },
      MuiCardHeader: {
        styleOverrides: {
          root: {
            '&.MuiCardHeader-root': {
              borderBottom: 'none',
              paddingBlockEnd: 'var(--pf-t--global--spacer--md)',
              paddingBlockStart: 'var(--pf-t--global--spacer--lg)',
              paddingLeft: 'var(--pf-t--global--spacer--lg)',
              paddingRight: 'var(--pf-t--global--spacer--lg)',
            },
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            '&.MuiCardContent-root': {
              borderTop: 'none',
              '&:last-child': {
                paddingBottom: 'var(--pf-t--global--spacer--lg)',
                paddingLeft: 'var(--pf-t--global--spacer--lg)',
                paddingRight: 'var(--pf-t--global--spacer--lg)',
              },
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          // Hide the notched outline (no floating label in border)
          notchedOutline: {
            border: 'none',
          },
          root: {
            // Bootstrap-style: full border on the root instead
            borderRadius: 'var(--pf-t--global--border--radius--small)',
            border: '1px solid',
            borderColor: 'var(--pf-t--global--border--color--default)',
            backgroundColor: 'var(--pf-t--global--background--color--primary--default)',
            '&:hover': {
              borderColor: 'var(--pf-t--global--border--color--hover)',
            },
            '&.Mui-focused': {
              borderColor: 'var(--pf-t--global--border--color--clicked)',
            },
          },
          input: {
            padding: 'var(--pf-t--global--spacer--sm) var(--pf-t--global--spacer--md)',
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          icon: {
            color: primaryTextColor,
          },
        },
      },
      MuiFormLabel: {
        styleOverrides: {
          root: {
            color: 'var(--pf-t--global--text--color--regular)',
            fontWeight: 'var(--pf-t--global--font--weight--body--bold)',
            // Ensure consistent left alignment
            paddingLeft: 0,
            marginLeft: 0,
            '&.Mui-focused': {
              color: 'var(--pf-t--global--text--color--regular)',
            },
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: 'var(--pf-t--global--text--color--regular)',
            fontWeight: 'var(--pf-t--global--font--weight--body--bold)',
            // Position label above input (standard-like behavior)
            position: 'relative',
            transform: 'none',
            marginBottom: 'var(--pf-t--global--spacer--sm)',
            marginLeft: 0,
            paddingLeft: 0,
            fontSize: 'var(--pf-t--global--font--size--body--default)',
            '&.Mui-focused': {
              color: 'var(--pf-t--global--text--color--regular)',
            },
            '&.MuiInputLabel-shrink': {
              transform: 'none',
              fontWeight: 'var(--pf-t--global--font--weight--body--bold)',
              marginLeft: 0,
              paddingLeft: 0,
            },
            '&.MuiInputLabel-outlined': {
              fontWeight: 'var(--pf-t--global--font--weight--body--bold)',
            },
            '&.MuiInputLabel-outlined.MuiInputLabel-shrink': {
              fontWeight: 'var(--pf-t--global--font--weight--body--bold)',
            },
          },
          shrink: {
            fontWeight: 'var(--pf-t--global--font--weight--body--bold)',
          },
          outlined: {
            fontWeight: 'var(--pf-t--global--font--weight--body--bold)',
          },
        },
      },
      MuiFormControl: {},
      MuiFormHelperText: {
        styleOverrides: {
          root: {
            marginLeft: 0,
          },
        },
      },
      MuiStack: {},
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            padding: 'var(--pf-t--global--spacer--lg)',
            fontSize: 'var(--pf-t--global--font--size--heading--md)',
            fontWeight: 'var(--pf-t--global--font--weight--heading--default)',
          },
        },
      },
      MuiDialogActions: {
        styleOverrides: {
          root: {
            padding: 'var(--pf-t--global--spacer--lg)',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 'var(--pf-t--global--border--radius--large)',
          },
          root: {
            // Styles scoped to modal/dialog only
            '& .MuiStack-root': {
              paddingTop: t_global_spacer_md.value,
            },
            '& .MuiFormLabel-root, & .MuiInputLabel-root': {
              paddingLeft: 0,
              fontWeight: 'var(--pf-t--global--font--weight--body--bold)',
            },
            // Target the label that's a sibling of the PromQL expression editor
            '& .MuiStack-root:has([data-testid="promql_expression_editor"]) > .MuiInputLabel-root':
              {
                left: 0,
                marginLeft: 0,
              },
            // Only apply margin-top to icon button directly adjacent to PromQL expression editor
            '& [data-testid="promql_expression_editor"] + .MuiIconButton-root': {
              marginTop: t_global_spacer_md.value,
            },
            // CodeMirror editor text - always dark
            '& .cm-line': {
              color: t_color_gray_95.value,
            },
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            // Use PatternFly inverse colors for tooltip
            backgroundColor: 'var(--pf-t--global--background--color--inverse--default)',
            // Override Typography color inside tooltip
            '& .MuiTypography-root': {
              color: 'var(--pf-t--global--text--color--inverse)',
            },
          },
          arrow: {
            color: 'var(--pf-t--global--background--color--inverse--default)',
          },
        },
      },
      MuiPickersDay: {
        styleOverrides: {
          root: {
            '&.Mui-selected': {
              // Lighter brand bg + dark text in dark theme, default brand bg + white text in light theme
              backgroundColor: 'var(--pf-t--global--color--brand--default)',
              color: 'var(--pf-t--global--text--color--on-brand--default)',
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 'var(--pf-t--global--border--radius--pill)',
          },
          containedPrimary: {
            // Text color for content on brand background
            color: 'var(--pf-t--global--text--color--on-brand--default)',
            backgroundColor: 'var(--pf-t--global--color--brand--default)',
            '&:hover': {
              backgroundColor: 'var(--pf-t--global--color--brand--hover)',
            },
            '&:active': {
              backgroundColor: 'var(--pf-t--global--color--brand--clicked)',
            },
          },
          outlinedPrimary: {
            color: 'var(--pf-t--global--color--brand--default)',
            borderColor: 'var(--pf-t--global--color--brand--default)',
            '&:hover': {
              borderColor: 'var(--pf-t--global--color--brand--hover)',
            },
          },
          outlinedSecondary: {
            // Icon-style buttons (refresh, etc.) - use small radius instead of pill
            borderRadius: 'var(--pf-t--global--border--radius--small)',
            borderColor: 'var(--pf-t--global--border--color--default)',
            '&:hover': {
              borderColor: 'var(--pf-t--global--border--color--hover)',
              backgroundColor: 'var(--pf-t--global--background--color--control--default)',
            },
          },
        },
      },
      MuiClock: {
        styleOverrides: {
          root: {
            // Clock pin (center dot)
            '& .MuiClock-pin': {
              backgroundColor: 'var(--pf-t--global--color--brand--default)',
            },
            // AM/PM buttons when selected
            '& .MuiClock-amButton.Mui-selected, & .MuiClock-pmButton.Mui-selected': {
              backgroundColor: 'var(--pf-t--global--color--brand--default)',
              '&:hover': {
                backgroundColor: 'var(--pf-t--global--color--brand--hover)',
              },
              // AM/PM text inside selected button - use inverse color
              '& .MuiClock-meridiemText': {
                color: 'var(--pf-t--global--text--color--inverse)',
              },
            },
          },
        },
      },
      MuiClockPointer: {
        styleOverrides: {
          root: {
            // Clock hand/pointer
            backgroundColor: 'var(--pf-t--global--color--brand--default)',
          },
          thumb: {
            // Clock pointer thumb (circle at the end)
            backgroundColor: 'var(--pf-t--global--color--brand--default)',
            borderColor: 'var(--pf-t--global--color--brand--default)',
            // Text color - inverse
            color: 'var(--pf-t--global--text--color--inverse)',
          },
        },
      },
      MuiClockNumber: {
        styleOverrides: {
          root: {
            // Selected clock number - use inverse text color
            '&.Mui-selected': {
              color: 'var(--pf-t--global--text--color--inverse)',
            },
          },
        },
      },
    },
  };
};

export const usePatternFlyTheme = (): { muiTheme: Theme; chartsTheme: PersesChartsTheme } => {
  const { theme: contextTheme } = useThemeContext();
  const theme: PatternFlyTheme = contextTheme === 'dark' ? 'dark' : 'light';

  return React.useMemo(() => {
    const muiTheme = getTheme(theme, {
      shape: {
        borderRadius: 6,
      },
      ...mapPatterflyThemeToMUI(theme),
    });

    const chartsTheme: PersesChartsTheme = generateChartsTheme(muiTheme, {
      echartsTheme: {
        color: patternflyChartsMultiUnorderedPalette,
      },
      thresholds: {
        defaultColor: patternflyBlue300,
        palette: defaultPaletteColors,
      },
    });

    return { muiTheme, chartsTheme };
  }, [theme]);
};
