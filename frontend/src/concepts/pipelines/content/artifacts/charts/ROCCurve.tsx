import React from 'react';
import {
  Chart,
  ChartAxis,
  ChartGroup,
  ChartLine,
  ChartVoronoiContainer,
} from '@patternfly/react-charts';
import {
  chart_color_blue_100 as chartColorBlue100,
  chart_color_blue_200 as chartColorBlue200,
  chart_color_blue_300 as chartColorBlue300,
  chart_color_blue_400 as chartColorBlue400,
  chart_color_blue_500 as chartColorBlue500,
  chart_color_cyan_100 as chartColorCyan100,
  chart_color_cyan_200 as chartColorCyan200,
  chart_color_cyan_300 as chartColorCyan300,
  chart_color_cyan_400 as chartColorCyan400,
  chart_color_cyan_500 as chartColorCyan500,
  chart_color_black_100 as chartColorBlack100,
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
  chartColorBlue100.value,
  chartColorBlue200.value,
  chartColorBlue300.value,
  chartColorBlue400.value,
  chartColorBlue500.value,
  chartColorCyan100.value,
  chartColorCyan200.value,
  chartColorCyan300.value,
  chartColorCyan400.value,
  chartColorCyan500.value,
];

type ROCCurveProps = {
  configs: ROCCurveConfig[];
  maxDimension?: number;
  maxContainerWidth?: number;
};

const ROCCurve: React.FC<ROCCurveProps> = ({ configs, maxContainerWidth, maxDimension = 800 }) => {
  const baseLineData = Array.from(Array(100).keys()).map((x) => ({ x: x / 100, y: x / 100 }));

  return (
    <div style={{ width: maxContainerWidth || maxDimension }}>
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
