import {
  chart_global_FontFamily as chartGlobalFontFamily,
  chart_global_FontSize_sm as chartGlobalFontSizeSm,
} from '@patternfly/react-tokens';
import { getCSSVar } from '~/app/utilities/utils';

/**
 * Direct ECharts theme for AutoRAG radar charts.
 *
 * PatternFly Charts' `themeColor` path calls `getTheme()`, which JSON.parse()s
 * computed CSS numeric tokens. Production Lightning CSS minifies `0.5` to `.5`,
 * and `JSON.parse('.5')` throws. Passing `theme` skips that parser.
 */
export const getRadarChartTheme = (): Record<string, unknown> => {
  const fontFamily = getCSSVar(
    chartGlobalFontFamily.name,
    String(chartGlobalFontFamily.value).replace(/"/g, "'"),
  );
  const fontSize = chartGlobalFontSizeSm.value;

  return {
    textStyle: { fontFamily, fontSize },
    legend: { textStyle: { fontFamily, fontSize } },
    radar: {
      itemStyle: { borderWidth: 1 },
      lineStyle: { width: 2 },
      smooth: false,
    },
  };
};
