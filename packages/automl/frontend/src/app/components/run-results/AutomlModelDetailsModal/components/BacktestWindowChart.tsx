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
import { findMetricValue, formatMetricName, getMetricDescription } from '~/app/utilities/utils';
import InlineTooltip from '~/app/components/InlineTooltip';
import {
  BACKTEST_CHART_PADDING,
  COLOR_SCALE,
  HOLDOUT_COLOR,
  TOOLTIP_TEXT_PROPS,
} from './chartConstants';
import BacktestCurveChart, { type ChartDataPoint, type ChartSeries } from './BacktestCurveChart';

type BacktestWindowChartProps = {
  perWindowMetrics: BackTestingPerWindowMetric[];
  evalMetric: string;
  holdoutMetrics: Record<string, number>;
};

const CHART_W = 900;
const DOMAIN_PADDING = { y: 20 };
const VORONOI_BLACKLIST = ['area-fill', 'window-line'];

function formatDateRange(startStr: string, endStr: string): string {
  const start = new Date(startStr);
  const end = new Date(endStr);
  const startLabel = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  if (start.getMonth() === end.getMonth()) {
    return `${startLabel}–${end.getDate()}`;
  }
  return `${startLabel}–${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

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

// --- Custom tooltip -----------------------------------------------------------

const TOOLTIP_W = 200;
const TOOLTIP_H = 64;
const ROW_H = 18;

type TooltipDatum = ChartDataPoint & { _x?: number; _y?: number };

const BacktestWindowTooltip = ({
  datum,
  active,
  x,
}: {
  datum?: TooltipDatum;
  active?: boolean;
  x?: number;
  [key: string]: unknown;
}): React.ReactElement => {
  if (!active || !datum || x == null) {
    return <g />;
  }

  const isHoldout = datum.name.startsWith('Holdout');
  const header = datum.name.split(': ')[0];
  const windowValue = !isHoldout ? datum.y.toFixed(2) : '-';
  const holdoutValue = isHoldout ? datum.y.toFixed(2) : '-';

  const plotRight = CHART_W - BACKTEST_CHART_PADDING.right;
  const flipped = x + 12 + TOOLTIP_W > plotRight;
  const tx = flipped ? x - TOOLTIP_W - 12 : x + 12;

  const plotTop = BACKTEST_CHART_PADDING.top;
  const plotH = 250 - BACKTEST_CHART_PADDING.top - BACKTEST_CHART_PADDING.bottom;
  const ty = plotTop + plotH / 2 - TOOLTIP_H / 2;

  const headerY = ty + 14;
  const row1Y = headerY + ROW_H;
  const row2Y = row1Y + ROW_H;

  return (
    <g>
      <rect
        x={tx}
        y={ty}
        width={TOOLTIP_W}
        height={TOOLTIP_H}
        rx={4}
        fill="var(--pf-t--global--background--color--primary--default)"
        stroke="var(--pf-t--global--border--color--default)"
        strokeWidth={1}
      />
      <text x={tx + 10} y={headerY} {...TOOLTIP_TEXT_PROPS}>
        {header}
      </text>
      <circle cx={tx + 14} cy={row1Y - 4} r={4} fill={COLOR_SCALE[0]} />
      <text x={tx + 24} y={row1Y} {...TOOLTIP_TEXT_PROPS}>
        Backtest windows
      </text>
      <text
        x={tx + TOOLTIP_W - 10}
        y={row1Y}
        {...TOOLTIP_TEXT_PROPS}
        fontWeight="bold"
        textAnchor="end"
      >
        {windowValue}
      </text>
      <circle cx={tx + 14} cy={row2Y - 4} r={4} fill={HOLDOUT_COLOR} />
      <text x={tx + 24} y={row2Y} {...TOOLTIP_TEXT_PROPS}>
        Holdout
      </text>
      <text
        x={tx + TOOLTIP_W - 10}
        y={row2Y}
        {...TOOLTIP_TEXT_PROPS}
        fontWeight="bold"
        textAnchor="end"
      >
        {holdoutValue}
      </text>
    </g>
  );
};

const TOOLTIP_ELEMENT = <BacktestWindowTooltip />;

// --- Component ----------------------------------------------------------------

const BacktestWindowChart: React.FC<BacktestWindowChartProps> = ({
  perWindowMetrics,
  evalMetric,
  holdoutMetrics,
}) => {
  const [selectedMetric, setSelectedMetric] = React.useState(evalMetric);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);

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
    const entry = findMetricValue(holdoutMetrics, selectedMetric);
    if (entry === undefined) {
      return undefined;
    }
    // AutoGluon negates all timeseries metrics so "higher is better".
    // Invert to show the raw positive error value, consistent with per-window metrics.
    const rawValue = Math.abs(entry.value);
    return {
      x: perWindowMetrics.length,
      y: rawValue,
      name: `Holdout: ${rawValue.toFixed(4)}`,
    };
  }, [holdoutMetrics, selectedMetric, perWindowMetrics.length]);

  const holdoutIdx = holdoutPoint ? perWindowMetrics.length : -1;
  const xAxisStyle = React.useMemo(
    () => ({
      tickLabels: {
        fontSize: 12,
        fill: ({ index }: { index: number }) => (index === holdoutIdx ? HOLDOUT_COLOR : undefined),
      },
    }),
    [holdoutIdx],
  );

  const tickFormat = React.useCallback(
    (val: number) => {
      if (val === perWindowMetrics.length) {
        return 'Holdout';
      }
      if (val >= perWindowMetrics.length) {
        return '';
      }
      const w = perWindowMetrics[val];
      return formatDateRange(w.test_start, w.test_end);
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
        name: 'area-fill',
        data: windowData,
        style: { data: { fill: COLOR_SCALE[0], opacity: isHovered ? 0 : 0.2, stroke: 'none' } },
      },
      {
        type: 'line',
        name: 'window-line',
        data: windowData,
        style: { data: { stroke: COLOR_SCALE[0] } },
      },
      {
        type: 'scatter',
        data: windowData,
        style: {
          data: {
            fill: 'var(--pf-t--global--background--color--primary--default)',
            stroke: COLOR_SCALE[0],
            strokeWidth: 2,
          },
        },
      },
    ];
    if (holdoutPoint) {
      s.push({
        type: 'scatter',
        data: [holdoutPoint],
        style: { data: { fill: HOLDOUT_COLOR } },
      });
    }
    return s;
  }, [windowData, holdoutPoint, isHovered]);

  return (
    <>
      <Title headingLevel="h3" size="md" className="pf-v6-u-mb-sm">
        {metricDisplayName} by backtest window
      </Title>
      <Content component={ContentVariants.p} className="pf-v6-u-mb-lg pf-v6-u-color-200">
        Each point shows{' '}
        <InlineTooltip text={metricDisplayName} tooltip={getMetricDescription(selectedMetric)} />{' '}
        for one rolling validation window. An upward trend may indicate the model struggles with
        later time periods. The holdout point shows performance on data completely excluded from
        training and validation.
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
      <div
        className="automl-backtest-window-chart-container"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <BacktestCurveChart
          series={series}
          tickValues={tickValues}
          tickFormat={tickFormat}
          ariaDesc={`${metricDisplayName} by backtest window`}
          height={250}
          width={CHART_W}
          domainPadding={DOMAIN_PADDING}
          voronoiBlacklist={VORONOI_BLACKLIST}
          labelComponent={TOOLTIP_ELEMENT}
          xAxisStyle={xAxisStyle}
          yAxisLabel={metricDisplayName}
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
      </div>
    </>
  );
};

export default BacktestWindowChart;
