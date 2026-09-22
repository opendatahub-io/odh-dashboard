import { chart_global_FontSize_sm as chartGlobalFontSizeSm } from '@patternfly/react-tokens';
import { getRadarChartTheme } from '~/app/components/run-results/PatternDetailsModal/components/radarChartTheme';

describe('getRadarChartTheme', () => {
  it('should return numeric font and radar values without JSON-parsing CSS tokens', () => {
    const theme = getRadarChartTheme() as {
      textStyle: { fontSize: number };
      radar: { itemStyle: { borderWidth: number }; lineStyle: { width: number }; smooth: boolean };
    };

    expect(theme.textStyle.fontSize).toBe(chartGlobalFontSizeSm.value);
    expect(theme.radar.itemStyle.borderWidth).toBe(1);
    expect(theme.radar.lineStyle.width).toBe(2);
    expect(theme.radar.smooth).toBe(false);
  });
});
