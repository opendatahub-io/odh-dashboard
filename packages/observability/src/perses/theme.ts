import React from 'react';
import { Theme, ThemeOptions } from '@mui/material';
import { ChartThemeColor, getThemeColors } from '@patternfly/react-charts/victory';
import {
  generateChartsTheme,
  getTheme,
  PersesChartsTheme,
  typography,
} from '@perses-dev/components';
import {
  chart_color_blue_100,
  chart_color_blue_200,
  chart_color_blue_300,
  t_color_gray_95,
  t_color_white,
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
        color: 'var(--pf-t--global--text--color--brand--default)',
        fontWeight: 'var(--pf-t--global--font--weight--body--default)',
        fontSize: 'var(--pf-t--global--font--size--600)',
      },
    },
    palette: {
      primary: {
        light: chart_color_blue_100.value,
        main: chart_color_blue_200.value,
        dark: chart_color_blue_300.value,
        contrastText: primaryTextColor,
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
          notchedOutline: {
            borderColor: 'var(--pf-t--global--border--color--default)',
          },
          root: {
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--pf-t--global--border--color--default)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--pf-t--global--border--color--default)',
            },
          },
          input: {
            // Dashboard Variables >> Text Variable
            padding: '8.5px 14px',
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
