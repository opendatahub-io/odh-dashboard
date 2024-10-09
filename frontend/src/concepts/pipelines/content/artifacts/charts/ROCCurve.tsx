import React from 'react';
import {
  Chart,
  ChartAxis,
  ChartGroup,
  ChartLine,
  ChartVoronoiContainer,
} from '@patternfly/react-charts/victory';
import {
  chart_color_black_100 as chartColorBlack100,
  chart_theme_multi_color_ordered_ColorScale_100 as chartThemeMultiColorOrderedColorScale100,
  chart_theme_multi_color_ordered_ColorScale_200 as chartThemeMultiColorOrderedColorScale200,
  chart_theme_multi_color_ordered_ColorScale_300 as chartThemeMultiColorOrderedColorScale300,
  chart_theme_multi_color_ordered_ColorScale_400 as chartThemeMultiColorOrderedColorScale400,
  chart_theme_multi_color_ordered_ColorScale_500 as chartThemeMultiColorOrderedColorScale500,
  chart_theme_multi_color_ordered_ColorScale_600 as chartThemeMultiColorOrderedColorScale600,
  chart_theme_multi_color_ordered_ColorScale_700 as chartThemeMultiColorOrderedColorScale700,
  chart_theme_multi_color_ordered_ColorScale_800 as chartThemeMultiColorOrderedColorScale800,
  chart_theme_multi_color_ordered_ColorScale_900 as chartThemeMultiColorOrderedColorScale900,
  chart_theme_multi_color_ordered_ColorScale_1000 as chartThemeMultiColorOrderedColorScale1000,
} from '@patternfly/react-tokens';

export type ROCCurveConfig = {
  index: number;
  data: {
    name: string;
    x: number;
    y: number;
    index: number;
  }[];
};

export const RocCurveChartColorScale = [
  chartThemeMultiColorOrderedColorScale100.value,
  chartThemeMultiColorOrderedColorScale200.value,
  chartThemeMultiColorOrderedColorScale300.value,
  chartThemeMultiColorOrderedColorScale400.value,
  chartThemeMultiColorOrderedColorScale500.value,
  chartThemeMultiColorOrderedColorScale600.value,
  chartThemeMultiColorOrderedColorScale700.value,
  chartThemeMultiColorOrderedColorScale800.value,
  chartThemeMultiColorOrderedColorScale900.value,
  chartThemeMultiColorOrderedColorScale1000.value,
];

type ROCCurveProps = {
  configs: ROCCurveConfig[];
  maxDimension?: number;
  maxContainerWidth?: number;
};

const ROCCurve: React.FC<ROCCurveProps> = ({ configs, maxContainerWidth, maxDimension = 800 }) => {
  const baseLineData = Array.from(Array(100).keys()).map((x) => ({ x: x / 100, y: x / 100 }));

  return (
    <div style={{ width: maxContainerWidth || maxDimension }} data-testid="roc-curve-graph">
      <Chart
        ariaDesc="ROC Curve"
        ariaTitle="ROC Curve"
        containerComponent={
          <ChartVoronoiContainer
            constrainToVisibleArea
            voronoiBlacklist={['baseline']}
            labels={({ datum }) => `threshold (Series #${datum.index + 1}): ${datum.name}`}
          />
        }
        height={maxDimension}
        width={maxDimension}
        padding={{ bottom: 100, left: 100, right: 50, top: 50 }}
        legendAllowWrap
        legendPosition="bottom-left"
        legendData={configs.map((config) => ({
          name: `Series #${config.index + 1}`,
          symbol: {
            fill: RocCurveChartColorScale[config.index % RocCurveChartColorScale.length],
            type: 'square',
          },
        }))}
      >
        <ChartAxis
          showGrid
          dependentAxis
          label="True positive rate"
          tickValues={Array.from(Array(11).keys()).map((x) => x / 10)}
        />
        <ChartAxis
          showGrid
          label="False positive rate"
          tickValues={Array.from(Array(21).keys()).map((x) => x / 20)}
        />
        <ChartGroup>
          <ChartLine
            name="baseline"
            data={baseLineData}
            style={{
              data: {
                strokeDasharray: '3,3',
                stroke: chartColorBlack100.value,
              },
            }}
          />
          {configs.map((config, idx) => (
            <ChartLine
              key={idx}
              data={config.data}
              interpolation="basis"
              style={{
                data: {
                  stroke: RocCurveChartColorScale[config.index % RocCurveChartColorScale.length],
                },
              }}
            />
          ))}
        </ChartGroup>
      </Chart>
    </div>
  );
};

export default ROCCurve;
