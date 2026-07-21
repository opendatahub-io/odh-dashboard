import {
  t_chart_color_black_500 as chartColorBlack500,
  chart_theme_multi_color_ordered_ColorScale_100 as chartThemeColor100,
  chart_theme_multi_color_ordered_ColorScale_200 as chartThemeColor200,
  chart_theme_multi_color_ordered_ColorScale_300 as chartThemeColor300,
  chart_theme_multi_color_ordered_ColorScale_400 as chartThemeColor400,
  chart_theme_multi_color_ordered_ColorScale_500 as chartThemeColor500,
} from '@patternfly/react-tokens';

export { chartColorBlack500 };

export const COLOR_SCALE = [
  chartThemeColor100.value,
  chartThemeColor200.value,
  chartThemeColor300.value,
  chartThemeColor400.value,
  chartThemeColor500.value,
];

export const TICK_VALUES = Array.from({ length: 11 }, (_, i) => i / 10);
export const CHART_PADDING = { bottom: 60, left: 80, right: 50, top: 20 };
export const BACKTEST_CHART_PADDING = { bottom: 60, left: 80, right: 40, top: 20 };
export const HOLDOUT_COLOR = 'var(--automl-holdout-color)';

export const TOOLTIP_TEXT_PROPS = {
  fontSize: 11,
  fill: 'var(--pf-t--global--text--color--regular)',
  fontFamily: 'var(--pf-t--global--font--family--body)',
};
