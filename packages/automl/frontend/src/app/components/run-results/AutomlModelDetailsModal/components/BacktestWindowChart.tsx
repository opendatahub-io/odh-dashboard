import React from 'react';
import {
  Chart,
  ChartArea,
  ChartAxis,
  ChartGroup,
  ChartLine,
  ChartVoronoiContainer,
} from '@patternfly/react-charts/victory';
import { MenuToggle, Select, SelectOption, Title } from '@patternfly/react-core';
import type { BackTestingPerWindowMetric } from '~/app/types';
import { COLOR_SCALE } from './chartConstants';

type BacktestWindowChartProps = {
  perWindowMetrics: BackTestingPerWindowMetric[];
  evalMetric: string;
};

type ChartPoint = { x: number; y: number; name: string };

function buildChartData(
  perWindowMetrics: BackTestingPerWindowMetric[],
  metric: string,
): ChartPoint[] {
  return perWindowMetrics.map((w, idx) => {
    const value = w.metrics[metric] ?? 0;
    return {
      x: idx,
      y: value,
      name: `Window ${w.window_id + 1}: ${value.toFixed(4)}`,
    };
  });
}

const CHART_PADDING = { bottom: 60, left: 80, right: 40, top: 20 };
const voronoiLabels = ({ datum }: { datum: ChartPoint }) => datum.name;

const BacktestWindowChart: React.FC<BacktestWindowChartProps> = ({
  perWindowMetrics,
  evalMetric,
}) => {
  const [selectedMetric, setSelectedMetric] = React.useState(evalMetric);
  const [isOpen, setIsOpen] = React.useState(false);

  const metricKeys = React.useMemo(
    () => (perWindowMetrics.length > 0 ? Object.keys(perWindowMetrics[0].metrics) : []),
    [perWindowMetrics],
  );

  const chartData = React.useMemo(
    () => buildChartData(perWindowMetrics, selectedMetric),
    [perWindowMetrics, selectedMetric],
  );

  const tickFormat = React.useCallback(
    (val: number) =>
      val < perWindowMetrics.length ? `Window ${perWindowMetrics[val].window_id + 1}` : '',
    [perWindowMetrics],
  );

  return (
    <div data-testid="backtest-window-chart">
      <Title headingLevel="h3" size="md" className="pf-v6-u-mb-sm">
        {selectedMetric} by backtest window
      </Title>
      <Select
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        selected={selectedMetric}
        onSelect={(_e, value) => {
          setSelectedMetric(String(value));
          setIsOpen(false);
        }}
        toggle={(ref) => (
          <MenuToggle
            ref={ref}
            onClick={() => setIsOpen(!isOpen)}
            isExpanded={isOpen}
            data-testid="metric-selector-toggle"
          >
            {selectedMetric}
          </MenuToggle>
        )}
      >
        {metricKeys.map((key) => (
          <SelectOption key={key} value={key}>
            {key}
          </SelectOption>
        ))}
      </Select>
      <Chart
        ariaDesc={`${selectedMetric} by backtest window`}
        ariaTitle={`${selectedMetric} by backtest window`}
        containerComponent={<ChartVoronoiContainer constrainToVisibleArea labels={voronoiLabels} />}
        height={300}
        padding={CHART_PADDING}
      >
        <ChartAxis tickFormat={tickFormat} tickValues={chartData.map((d) => d.x)} />
        <ChartAxis dependentAxis showGrid />
        <ChartGroup>
          <ChartArea
            data={chartData}
            style={{ data: { fill: COLOR_SCALE[0], opacity: 0.2, stroke: 'none' } }}
          />
          <ChartLine data={chartData} style={{ data: { stroke: COLOR_SCALE[0] } }} />
        </ChartGroup>
      </Chart>
    </div>
  );
};

export default BacktestWindowChart;
