import React from 'react';
import {
  Content,
  ContentVariants,
  Divider,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  MenuToggle,
  Select,
  SelectList,
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
  print?: boolean;
  initialSelectedMetrics?: string[];
  onSelectedMetricsChange?: (metrics: string[]) => void;
};

const CHART_W = 900;
const CHART_W_GRID = 400;
const CHART_H = 250;
const DOMAIN_PADDING = { y: 20 };
const VORONOI_BLACKLIST = ['area-fill', 'window-line'];
const SHOW_ALL = '__show_all__';

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
    // Use findMetricValue to handle both snake_case and acronym metric keys
    const entry = findMetricValue(w.metrics, metric);
    const value = entry?.value ?? 0;
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
  chartWidth = CHART_W,
}: {
  datum?: TooltipDatum;
  active?: boolean;
  x?: number;
  chartWidth?: number;
  [key: string]: unknown;
}): React.ReactElement => {
  if (!active || !datum || x == null) {
    return <g />;
  }

  const isHoldout = datum.name.startsWith('Holdout');
  const header = datum.name.split(': ')[0];
  const windowValue = !isHoldout ? datum.y.toFixed(2) : '-';
  const holdoutValue = isHoldout ? datum.y.toFixed(2) : '-';

  const plotRight = chartWidth - BACKTEST_CHART_PADDING.right;
  const flipped = x + 12 + TOOLTIP_W > plotRight;
  const rawTx = flipped ? x - TOOLTIP_W - 12 : x + 12;
  const tx = Math.max(5, Math.min(rawTx, chartWidth - TOOLTIP_W - 5));

  const plotTop = BACKTEST_CHART_PADDING.top;
  const plotH = CHART_H - BACKTEST_CHART_PADDING.top - BACKTEST_CHART_PADDING.bottom;
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

// --- Single metric chart -----------------------------------------------------

type BacktestMetricChartProps = {
  metric: string;
  perWindowMetrics: BackTestingPerWindowMetric[];
  holdoutMetrics: Record<string, number>;
  chartWidth: number;
};

const BacktestMetricChart: React.FC<BacktestMetricChartProps> = ({
  metric,
  perWindowMetrics,
  holdoutMetrics,
  chartWidth,
}) => {
  const [isHovered, setIsHovered] = React.useState(false);

  const windowData = React.useMemo(
    () => buildWindowData(perWindowMetrics, metric),
    [perWindowMetrics, metric],
  );

  const metricDisplayName = formatMetricName(metric);

  const holdoutPoint = React.useMemo<ChartDataPoint | undefined>(() => {
    const entry = findMetricValue(holdoutMetrics, metric);
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
  }, [holdoutMetrics, metric, perWindowMetrics.length]);

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

  const tooltipElement = React.useMemo(
    () => <BacktestWindowTooltip chartWidth={chartWidth} />,
    [chartWidth],
  );

  return (
    <div onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <BacktestCurveChart
        series={series}
        tickValues={tickValues}
        tickFormat={tickFormat}
        ariaDesc={`${metricDisplayName} by backtest window`}
        height={CHART_H}
        width={chartWidth}
        domainPadding={DOMAIN_PADDING}
        voronoiBlacklist={VORONOI_BLACKLIST}
        labelComponent={tooltipElement}
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
  );
};

// --- Main component ----------------------------------------------------------

const BacktestWindowChart: React.FC<BacktestWindowChartProps> = ({
  perWindowMetrics,
  evalMetric,
  holdoutMetrics,
  print,
  initialSelectedMetrics,
  onSelectedMetricsChange,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const metricKeys = React.useMemo(
    () => (perWindowMetrics.length > 0 ? Object.keys(perWindowMetrics[0].metrics) : []),
    [perWindowMetrics],
  );

  // Normalize evalMetric to match the actual keys in the data (handles snake_case → acronym)
  const normalizedEvalMetric = React.useMemo(() => {
    if (metricKeys.length === 0) {
      return evalMetric;
    }
    const entry = findMetricValue(Object.fromEntries(metricKeys.map((k) => [k, 1])), evalMetric);
    return entry?.key ?? metricKeys[0];
  }, [metricKeys, evalMetric]);

  const [selectedMetrics, setSelectedMetrics] = React.useState<string[]>(
    initialSelectedMetrics?.length ? initialSelectedMetrics : [normalizedEvalMetric],
  );

  React.useEffect(() => {
    if (metricKeys.length === 0) {
      return;
    }
    setSelectedMetrics((prev) => {
      const valid = prev.filter((m) => metricKeys.includes(m));
      const next = valid.length > 0 ? valid : [normalizedEvalMetric];
      onSelectedMetricsChange?.(next);
      return next;
    });
  }, [metricKeys, normalizedEvalMetric, onSelectedMetricsChange]);

  const isAllSelected = selectedMetrics.length === metricKeys.length && metricKeys.length > 0;
  const isSingleMetric = selectedMetrics.length === 1;

  const updateMetrics = React.useCallback(
    (metrics: string[]) => {
      setSelectedMetrics(metrics);
      onSelectedMetricsChange?.(metrics);
    },
    [onSelectedMetricsChange],
  );

  const onSelect = React.useCallback(
    (_e: React.MouseEvent | undefined, value: string | number | undefined) => {
      const strValue = String(value);
      if (strValue === SHOW_ALL) {
        updateMetrics(isAllSelected ? [normalizedEvalMetric] : [...metricKeys]);
      } else {
        const next = selectedMetrics.includes(strValue)
          ? selectedMetrics.filter((m) => m !== strValue)
          : [...selectedMetrics, strValue];
        updateMetrics(next.length === 0 ? [normalizedEvalMetric] : next);
      }
    },
    [isAllSelected, normalizedEvalMetric, metricKeys, selectedMetrics, updateMetrics],
  );

  const toggleLabel = isAllSelected
    ? 'Show all'
    : selectedMetrics.length === 1
      ? formatMetricName(selectedMetrics[0])
      : `${selectedMetrics.length} metrics`;

  return (
    <>
      {isSingleMetric ? (
        <>
          <Title headingLevel="h3" size="md" className="pf-v6-u-mb-sm">
            {formatMetricName(selectedMetrics[0])} by backtest window
          </Title>
          <Content component={ContentVariants.p} className="pf-v6-u-mb-lg pf-v6-u-color-200">
            Each point shows{' '}
            <InlineTooltip
              text={formatMetricName(selectedMetrics[0])}
              tooltip={getMetricDescription(selectedMetrics[0])}
            />{' '}
            for one rolling validation window. An upward trend may indicate the model struggles with
            later time periods. The holdout point shows performance on data completely excluded from
            training and validation.
          </Content>
        </>
      ) : (
        <>
          <Title headingLevel="h3" size="md" className="pf-v6-u-mb-sm">
            {isAllSelected
              ? 'Showing all time-series by backtest window'
              : `Showing ${selectedMetrics.length} metrics by backtest window`}
          </Title>
          <Content component={ContentVariants.p} className="pf-v6-u-mb-lg pf-v6-u-color-200">
            {isAllSelected
              ? 'All time-series evaluation measures are shown for each rolling validation window.'
              : 'Selected time-series evaluation measures are shown for each rolling validation window.'}{' '}
            Compare trends across metrics, and use the holdout point to see performance on data
            completely excluded from training and validation.
          </Content>
        </>
      )}

      {!print && (
        <div className="pf-v6-u-mb-md">
          <Select
            isOpen={isOpen}
            onOpenChange={setIsOpen}
            onSelect={onSelect}
            toggle={(ref) => (
              <MenuToggle
                ref={ref}
                onClick={() => setIsOpen(!isOpen)}
                isExpanded={isOpen}
                data-testid="metric-selector-toggle"
              >
                {toggleLabel}
              </MenuToggle>
            )}
          >
            <SelectList>
              <SelectOption
                hasCheckbox
                value={SHOW_ALL}
                isSelected={isAllSelected}
                data-testid="metric-selector-show-all"
              >
                Show all
              </SelectOption>
            </SelectList>
            <Divider />
            <SelectList>
              {metricKeys.map((key) => (
                <SelectOption
                  key={key}
                  hasCheckbox
                  value={key}
                  isSelected={selectedMetrics.includes(key)}
                >
                  {formatMetricName(key)}
                </SelectOption>
              ))}
            </SelectList>
          </Select>
        </div>
      )}

      {isSingleMetric ? (
        <div className="automl-backtest-window-chart-container">
          <BacktestMetricChart
            metric={selectedMetrics[0]}
            perWindowMetrics={perWindowMetrics}
            holdoutMetrics={holdoutMetrics}
            chartWidth={CHART_W}
          />
        </div>
      ) : (
        <Grid hasGutter data-testid="backtest-window-chart-grid">
          {selectedMetrics.map((metric) => (
            <GridItem key={metric} span={6}>
              <div
                className="automl-backtest-window-chart-card"
                data-testid={`backtest-chart-card-${metric}`}
              >
                <Title headingLevel="h4" size="md" className="pf-v6-u-mb-xs">
                  {formatMetricName(metric)}
                </Title>
                <Content
                  component={ContentVariants.p}
                  className="pf-v6-u-mb-md pf-v6-u-color-200 pf-v6-u-font-size-sm"
                >
                  {getMetricDescription(metric)}
                </Content>
                <BacktestMetricChart
                  metric={metric}
                  perWindowMetrics={perWindowMetrics}
                  holdoutMetrics={holdoutMetrics}
                  chartWidth={CHART_W_GRID}
                />
              </div>
            </GridItem>
          ))}
        </Grid>
      )}
    </>
  );
};

export default BacktestWindowChart;
