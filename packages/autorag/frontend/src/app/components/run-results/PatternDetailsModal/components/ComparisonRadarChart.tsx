import React from 'react';
import { Charts } from '@patternfly/react-charts/echarts';
import * as echarts from 'echarts/core';
import { RadarChart } from 'echarts/charts';
import { TooltipComponent, RadarComponent, LegendComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import {
  chart_color_blue_300 as chartColorBlue300,
  chart_color_blue_100 as chartColorBlue100,
  chart_color_green_300 as chartColorGreen300,
  chart_color_green_100 as chartColorGreen100,
} from '@patternfly/react-tokens';
import type { AutoRAGEvaluationScores } from '~/app/types/autoragPattern';
import { getCSSVar } from '~/app/utilities/utils';
import { scoreIndicators } from './ScoreRadarChart';

let echartsRegistered = false;

type ComparisonRadarChartProps = {
  primaryScores: AutoRAGEvaluationScores;
  primaryLabel: string;
  comparisonScores: AutoRAGEvaluationScores;
  comparisonLabel: string;
};

const ComparisonRadarChart: React.FC<ComparisonRadarChartProps> = ({
  primaryScores,
  primaryLabel,
  comparisonScores,
  comparisonLabel,
}) => {
  if (!echartsRegistered) {
    echarts.use([RadarChart, RadarComponent, SVGRenderer, TooltipComponent, LegendComponent]);
    echartsRegistered = true;
  }

  const labelColor = getCSSVar('--pf-t--global--text--color--regular', '#151515');
  const splitLineColor = getCSSVar('--pf-t--global--border--color--default', '#d2d2d2');

  const option = React.useMemo(
    () => ({
      legend: {
        data: [primaryLabel, comparisonLabel],
        bottom: 0,
        textStyle: { color: labelColor },
        formatter: (name: string) => name,
        itemGap: 30,
        selectedMode: false,
      },
      radar: {
        indicator: scoreIndicators.map(({ label }) => ({ name: label, max: 1 })),
        radius: 70,
        center: ['50%', '45%'],
        axisName: { color: labelColor },
        splitLine: { lineStyle: { color: splitLineColor } },
        splitArea: { show: false },
        axisLine: { lineStyle: { color: splitLineColor } },
      },
      series: [
        {
          type: 'radar' as const,
          data: [
            {
              name: primaryLabel,
              value: scoreIndicators.map(({ key }) => primaryScores[key]),
              lineStyle: { color: chartColorBlue300.var },
              itemStyle: { color: chartColorBlue300.var },
              areaStyle: { color: chartColorBlue100.var, opacity: 0.3 },
              symbol: 'circle',
              symbolSize: 6,
            },
            {
              name: comparisonLabel,
              value: scoreIndicators.map(({ key }) => comparisonScores[key]),
              lineStyle: { color: chartColorGreen300.var },
              itemStyle: { color: chartColorGreen300.var },
              areaStyle: { color: chartColorGreen100.var, opacity: 0.3 },
              symbol: 'circle',
              symbolSize: 6,
            },
          ],
        },
      ],
      tooltip: {
        trigger: 'item' as const,
        appendToBody: true,
      },
    }),
    [primaryScores, comparisonScores, primaryLabel, comparisonLabel, labelColor, splitLineColor],
  );

  return (
    <Charts
      themeColor="blue"
      nodeSelector="html"
      height={320}
      width={600}
      option={option}
      data-testid="comparison-radar-chart"
    />
  );
};

export default ComparisonRadarChart;
