import React from 'react';
import {
  Content,
  ContentVariants,
  Flex,
  FlexItem,
  MenuToggle,
  Select,
  SelectOption,
  Title,
} from '@patternfly/react-core';
import type { BackTestingPerWindowMetric } from '~/app/types';
import { formatMetricName } from '~/app/utilities/utils';
import { COLOR_SCALE, HOLDOUT_COLOR } from './chartConstants';
import BacktestCurveChart, { type ChartDataPoint, type ChartSeries } from './BacktestCurveChart';

type BacktestWindowChartProps = {
  perWindowMetrics: BackTestingPerWindowMetric[];
  evalMetric: string;
  holdoutMetrics: Record<string, number>;
};

function formatDateLabel(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function buildWindowData(
  perWindowMetrics: BackTestingPerWindowMetric[],
  metric: string,
): ChartDataPoint[] {
  return perWindowMetrics.map((w, idx) => {
    const value = w.metrics[metric] ?? 0;
    return {
      x: idx,
      y: value,
      name: `${formatDateLabel(w.test_start)}–${formatDateLabel(w.test_end)}: ${value.toFixed(4)}`,
    };
  });
}

const BacktestWindowChart: React.FC<BacktestWindowChartProps> = ({
  perWindowMetrics,
  evalMetric,
  holdoutMetrics,
}) => {
  const [selectedMetric, setSelectedMetric] = React.useState(evalMetric);
  const [isOpen, setIsOpen] = React.useState(false);

  const metricKeys = React.useMemo(
    () => (perWindowMetrics.length > 0 ? Object.keys(perWindowMetrics[0].metrics) : []),
    [perWindowMetrics],
  );

  const windowData = React.useMemo(
    () => buildWindowData(perWindowMetrics, selectedMetric),
    [perWindowMetrics, selectedMetric],
  );

  const metricDisplayName = formatMetricName(selectedMetric);

  const holdoutPoint = React.useMemo<ChartDataPoint | undefined>(() => {
    if (!(selectedMetric in holdoutMetrics)) {
      return undefined;
    }
    const value = holdoutMetrics[selectedMetric];
    return {
      x: perWindowMetrics.length,
      y: value,
      name: `Holdout: ${value.toFixed(4)}`,
    };
  }, [holdoutMetrics, selectedMetric, perWindowMetrics.length]);

  const tickFormat = React.useCallback(
    (val: number) => {
      if (val === perWindowMetrics.length) {
        return 'Holdout';
      }
      if (val >= perWindowMetrics.length) {
        return '';
      }
      const w = perWindowMetrics[val];
      return `${formatDateLabel(w.test_start)}\n${formatDateLabel(w.test_end)}`;
    },
    [perWindowMetrics],
  );

  const tickValues = React.useMemo(() => {
    const vals = windowData.map((d) => d.x);
    if (holdoutPoint) {
      vals.push(holdoutPoint.x);
    }
    return vals;
  }, [windowData, holdoutPoint]);

  const series: ChartSeries[] = React.useMemo(() => {
    const s: ChartSeries[] = [
      {
        type: 'area',
        data: windowData,
        style: { data: { fill: COLOR_SCALE[0], opacity: 0.2, stroke: 'none' } },
      },
      { type: 'line', data: windowData, style: { data: { stroke: COLOR_SCALE[0] } } },
    ];
    if (holdoutPoint) {
      s.push({
        type: 'scatter',
        data: [holdoutPoint],
        style: { data: { fill: HOLDOUT_COLOR } },
      });
    }
    return s;
  }, [windowData, holdoutPoint]);

  return (
    <>
      <Title headingLevel="h3" size="md">
        {metricDisplayName} by backtest window
      </Title>
      <Content component={ContentVariants.p} className="pf-v6-u-mb-lg pf-v6-u-color-200">
        Each point shows {metricDisplayName.toLowerCase()} for one validation window. The holdout
        point reflects performance on data excluded from training.
      </Content>
      <div className="pf-v6-u-mb-md">
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
      </div>
      <BacktestCurveChart
        series={series}
        tickValues={tickValues}
        tickFormat={tickFormat}
        ariaDesc={`${metricDisplayName} by backtest window`}
        ariaTitle={`${metricDisplayName} by backtest window`}
        height={250}
        data-testid="backtest-window-chart"
      />
      <Flex
        spaceItems={{ default: 'spaceItemsMd' }}
        justifyContent={{ default: 'justifyContentCenter' }}
        className="pf-v6-u-mt-sm"
      >
        <FlexItem>
          <Flex
            spaceItems={{ default: 'spaceItemsSm' }}
            alignItems={{ default: 'alignItemsCenter' }}
          >
            <FlexItem>
              <svg width="10" height="10">
                <circle cx="5" cy="5" r="4" fill="none" stroke={COLOR_SCALE[0]} strokeWidth="2" />
              </svg>
            </FlexItem>
            <FlexItem>Backtest windows</FlexItem>
          </Flex>
        </FlexItem>
        <FlexItem>
          <Flex
            spaceItems={{ default: 'spaceItemsSm' }}
            alignItems={{ default: 'alignItemsCenter' }}
          >
            <FlexItem>
              <svg width="10" height="10">
                <circle cx="5" cy="5" r="4" fill={HOLDOUT_COLOR} />
              </svg>
            </FlexItem>
            <FlexItem>Holdout</FlexItem>
          </Flex>
        </FlexItem>
      </Flex>
    </>
  );
};

export default BacktestWindowChart;
