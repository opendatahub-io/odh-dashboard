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
import type { AutoRAGEvaluationMetricResult } from '~/app/types/autoragPattern';
import { formatMetricName, getCSSVar } from '~/app/utilities/utils';
import { formatRadarLabel, metricValues } from './radarChartUtils';

let echartsRegistered = false;

type ScoreRadarChartProps = {
  metrics: AutoRAGEvaluationMetricResult[];
  allMetricNames: string[];
};

const ScoreRadarChart: React.FC<ScoreRadarChartProps> = ({ metrics, allMetricNames }) => {
  if (!echartsRegistered) {
    echarts.use([RadarChart, RadarComponent, SVGRenderer, TooltipComponent]);
    echartsRegistered = true;
  }

  const labelColor = getCSSVar('--pf-t--global--text--color--regular', '#151515');
  const splitLineColor = getCSSVar('--pf-t--global--border--color--default', '#d2d2d2');
  const seriesColor = chartColorBlue300.var;

  const option = React.useMemo(
    () => ({
      radar: {
        indicator: allMetricNames.map((name) => ({
          name: formatRadarLabel(formatMetricName(name)),
          max: 1,
        })),
        radius: 70,
        center: ['45%', '55%'],
        axisName: { color: labelColor, lineHeight: 20 },
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
          areaStyle: { color: chartColorBlue100.var, opacity: 0.3 },
          symbol: 'circle',
          symbolSize: 6,
        },
      ],
      tooltip: {
        trigger: 'item' as const,
        appendToBody: true,
      },
    }),
    [metrics, allMetricNames, labelColor, splitLineColor, seriesColor],
  );

  return (
    <Charts
      themeColor="blue"
      nodeSelector="html"
      height={280}
      width={420}
      option={option}
      data-testid="score-radar-chart"
    />
  );
};

export default ScoreRadarChart;
