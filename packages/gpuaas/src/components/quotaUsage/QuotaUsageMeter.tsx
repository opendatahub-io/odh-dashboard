import * as React from 'react';
import {
  Chart,
  ChartAxis,
  ChartBar,
  ChartContainer,
  ChartStack,
} from '@patternfly/react-charts/victory';
import { Content, Flex, FlexItem, Spinner, Tooltip } from '@patternfly/react-core';
import {
  t_chart_color_black_200 as chartColorAvailable,
  t_chart_color_blue_300 as chartColorOwn,
  t_global_color_status_danger_default as colorStatusDanger,
} from '@patternfly/react-tokens';
import { QUOTA_USAGE_METER } from '../../const';
import { QUOTA_USAGE_METER_VARIANT, QuotaUsageMeterVariant } from '../../types';
import { buildQuotaUsageMeterSegments } from '../../utils/quotaUsageAggregation';
import '../QuotaUsageSection.scss';

const COMPACT_CHART_WIDTH = 120;
const FULL_CHART_WIDTH = 180;
const CHART_BAR_WIDTH = 10;
const METER_ROW_HEIGHT = 24;
const CHART_PADDING = {
  top: (METER_ROW_HEIGHT - CHART_BAR_WIDTH) / 2,
  bottom: (METER_ROW_HEIGHT - CHART_BAR_WIDTH) / 2,
  left: 0,
  right: 0,
};
const CATEGORY = 'usage';

const HIDDEN_METER_AXIS_STYLE = {
  axis: { stroke: 'transparent' },
  grid: { stroke: 'transparent' },
  ticks: { stroke: 'transparent', size: 0 },
  tickLabels: { fill: 'transparent' },
};

const METER_BAR_STYLE = {
  data: { stroke: 'transparent', strokeWidth: 0 },
};

type BarSeries = {
  name: string;
  value: number;
};

export type QuotaUsageMeterProps = {
  variant: QuotaUsageMeterVariant;
  used: number;
  capacity: number;
  percentage?: number | null | undefined;
  showOverQuotaVisual?: boolean;
  ariaLabel: string;
  compact?: boolean;
  showAcceleratorsLabel?: boolean;
  'data-testid'?: string;
};

const buildBarSeries = (
  withinQuotaValue: number,
  overQuotaValue: number,
  trackTotal: number,
): { series: BarSeries[]; colorScale: string[] } => {
  const availableValue = Math.max(0, trackTotal - withinQuotaValue - overQuotaValue);

  return {
    series: [
      { name: 'own', value: withinQuotaValue },
      { name: 'over', value: overQuotaValue },
      { name: 'available', value: availableValue },
    ],
    colorScale: [chartColorOwn.var, colorStatusDanger.var, chartColorAvailable.var],
  };
};

const QuotaUsageMeterChart: React.FC<{
  trackTotal: number;
  series: BarSeries[];
  colorScale: string[];
  width: number;
  chartName: string;
  'data-testid'?: string;
}> = ({ trackTotal, series, colorScale, width, chartName, 'data-testid': chartTestId }) => (
  <Chart
    horizontal
    height={METER_ROW_HEIGHT}
    width={width}
    name={chartName}
    domain={{ y: [0, trackTotal] }}
    padding={CHART_PADDING}
    containerComponent={
      chartTestId ? (
        <ChartContainer data-testid={chartTestId} aria-hidden="true" />
      ) : (
        <ChartContainer aria-hidden="true" />
      )
    }
  >
    <ChartAxis style={HIDDEN_METER_AXIS_STYLE} tickCount={0} />
    <ChartAxis dependentAxis showGrid={false} style={HIDDEN_METER_AXIS_STYLE} tickCount={0} />
    <ChartStack horizontal colorScale={colorScale} style={METER_BAR_STYLE}>
      {series.map(({ name, value }) => (
        <ChartBar
          key={name}
          name={name}
          barWidth={CHART_BAR_WIDTH}
          style={METER_BAR_STYLE}
          labels={() => null}
          data={[{ x: CATEGORY, y: value }]}
        />
      ))}
    </ChartStack>
  </Chart>
);

const QuotaUsageMeter: React.FC<QuotaUsageMeterProps> = ({
  variant,
  used,
  capacity,
  percentage,
  showOverQuotaVisual = false,
  ariaLabel,
  compact = false,
  showAcceleratorsLabel = false,
  'data-testid': testId,
}) => {
  const chartName = React.useId().replace(/:/g, '');
  const segments = buildQuotaUsageMeterSegments(variant, used, capacity, percentage);
  const trackTotal = Math.max(
    segments.capacity,
    segments.withinQuotaValue + segments.overQuotaValue,
    1,
  );
  const { series, colorScale } = buildBarSeries(
    segments.withinQuotaValue,
    segments.overQuotaValue,
    trackTotal,
  );
  const hasOverQuotaSegment = segments.overQuotaValue > 0;
  const valueText =
    variant === QUOTA_USAGE_METER_VARIANT.capacity && showAcceleratorsLabel
      ? `${segments.valueLabel} accelerators`
      : segments.valueLabel;
  const chartWidth = compact ? COMPACT_CHART_WIDTH : FULL_CHART_WIDTH;

  if (variant === QUOTA_USAGE_METER_VARIANT.utilization && percentage === null) {
    return (
      <Flex
        alignItems={{ default: 'alignItemsCenter' }}
        gap={{ default: 'gapSm' }}
        data-testid={testId}
      >
        <Spinner size="sm" aria-label={`Loading ${ariaLabel}`} />
      </Flex>
    );
  }

  const hasOverQuotaTooltip = hasOverQuotaSegment || (showOverQuotaVisual && segments.isOverQuota);
  const chartTestId = hasOverQuotaTooltip && testId ? `${testId}-over-quota` : undefined;

  const meterChart = (
    <QuotaUsageMeterChart
      trackTotal={trackTotal}
      series={series}
      colorScale={colorScale}
      width={chartWidth}
      chartName={chartName}
      data-testid={chartTestId}
    />
  );

  return (
    <Flex
      alignItems={{ default: 'alignItemsCenter' }}
      gap={{ default: 'gapSm' }}
      flexWrap={{ default: 'nowrap' }}
      aria-label={`${ariaLabel}: ${valueText}`}
      data-testid={testId}
    >
      <FlexItem flex={{ default: 'flexNone' }}>
        {hasOverQuotaTooltip ? (
          <Tooltip content={QUOTA_USAGE_METER.overQuotaTooltip}>{meterChart}</Tooltip>
        ) : (
          meterChart
        )}
      </FlexItem>
      <FlexItem>
        <Content component="p" className="gpuaas-quota-usage-meter__value">
          {valueText}
        </Content>
      </FlexItem>
    </Flex>
  );
};

export default QuotaUsageMeter;
