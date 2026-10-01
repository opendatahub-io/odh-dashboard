import React from 'react';
import { Charts } from '@patternfly/react-charts/echarts';
import * as echarts from 'echarts/core';
import { RadarChart } from 'echarts/charts';
import { TooltipComponent, RadarComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import {
  chart_color_blue_300 as chartColorBlue300,
  chart_color_blue_100 as chartColorBlue100,
} from '@patternfly/react-tokens';
import type { AutoRAGEvaluationMetricResult, MetricReference } from '~/app/types/autoragPattern';
import { getCSSVar } from '~/app/utilities/utils';
import { metricLabel } from '~/app/utilities/metricUtils';
import { formatRadarLabel, metricValues, radarAxisNameStyle } from './radarChartUtils';
import { getRadarChartTheme } from './radarChartTheme';

let echartsRegistered = false;

type ScoreRadarChartProps = {
  metrics: AutoRAGEvaluationMetricResult[];
  allMetricNames: MetricReference[];
};

const ScoreRadarChart: React.FC<ScoreRadarChartProps> = ({ metrics, allMetricNames }) => {
  if (!echartsRegistered) {
    echarts.use([RadarChart, RadarComponent, SVGRenderer, TooltipComponent]);
    echartsRegistered = true;
  }

  const labelColor = getCSSVar('--pf-t--global--text--color--regular', '#151515');
  const splitLineColor = getCSSVar('--pf-t--global--border--color--default', '#d2d2d2');
  const seriesColor = getCSSVar(chartColorBlue300.name, chartColorBlue300.value);
  const areaColor = getCSSVar(chartColorBlue100.name, chartColorBlue100.value);
  const theme = React.useMemo(() => getRadarChartTheme(), []);

  const option = React.useMemo(
    () => ({
      radar: {
        indicator: allMetricNames.map((metric) => ({
          name: formatRadarLabel(metricLabel(metric)),
          max: 1,
        })),
        radius: 56,
        center: ['50%', '52%'],
        axisName: radarAxisNameStyle(labelColor),
        axisNameGap: 8,
        splitLine: { lineStyle: { color: splitLineColor } },
        splitArea: { show: false },
        axisLine: { lineStyle: { color: splitLineColor } },
      },
      series: [
        {
          type: 'radar' as const,
          data: [
            {
              name: 'Scores',
              value: metricValues(metrics, allMetricNames),
            },
          ],
          lineStyle: { color: seriesColor },
          itemStyle: { color: seriesColor },
          areaStyle: { color: areaColor, opacity: 0.3 },
          symbol: 'circle',
          symbolSize: 6,
        },
      ],
      tooltip: {
        trigger: 'item' as const,
        appendToBody: true,
      },
    }),
    [metrics, allMetricNames, labelColor, splitLineColor, seriesColor, areaColor],
  );

  return (
    <Charts
      theme={theme}
      nodeSelector="html"
      height={340}
      width={480}
      option={option}
      data-testid="score-radar-chart"
    />
  );
};

export default ScoreRadarChart;
