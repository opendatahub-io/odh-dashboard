import * as React from 'react';
import {
  Bullseye,
  Content,
  ContentVariants,
  Flex,
  FlexItem,
  Label,
  Popover,
  Spinner,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import {
  ChartDonut,
  ChartDonutThreshold,
  ChartDonutUtilization,
  ChartLabel,
} from '@patternfly/react-charts/victory';
import {
  chart_color_black_300 as chartColorGray,
  chart_color_blue_300 as chartColorBlue,
  chart_color_purple_100 as chartColorPurple,
  chart_color_orange_100 as chartColorOrange,
} from '@patternfly/react-tokens';
import {
  AcceleratorSegment,
  BorrowLendInfo,
  PerModelDcgmData,
  buildDcgmBorrowedTooltip,
  buildDcgmLentTooltip,
  buildDcgmOwnTooltip,
  computeDcgmSplitData,
} from '../utils/clusterQueueUtils';
import { ModelGpuCount } from '../utils/hardwareModels';
import { CQ_DONUT_INNER_RADIUS, CQ_DONUT_SIZE } from '../const';

export type { BorrowLendInfo, PerModelDcgmData };

type BorrowLendBadgeProps = {
  type: 'borrowed' | 'lent';
  count: number;
  models: string[];
  perModelGpus?: ModelGpuCount[];
  counterpartCQNames?: string[];
};

type DcgmDonutProps = {
  /**
   * null      = data loading (show spinner)
   * undefined = data loaded but unavailable for this model (show 0% ring)
   * number    = loaded value to render
   */
  percentage: number | null | undefined;
  ariaLabel: string;
  borrowLendInfo?: BorrowLendInfo;
  /** Per-GPU-model utilization for richer hover tooltips in lent/borrowed state. */
  perModelData?: PerModelDcgmData[];
  testId?: string;
};

const SEGMENT_COLORS: Record<string, string> = {
  [AcceleratorSegment.Own]: chartColorBlue.value,
  [AcceleratorSegment.Lent]: chartColorPurple.value,
  [AcceleratorSegment.Available]: chartColorGray.value,
  [AcceleratorSegment.NoData]: chartColorGray.value,
};

export const TITLE_LABEL = <ChartLabel style={{ fontSize: 18, fill: 'currentColor' }} />;
export const SUBTITLE_LABEL = <ChartLabel style={{ fontSize: 13, fill: 'currentColor' }} />;

export const ChartColumn: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <FlexItem style={{ width: CQ_DONUT_SIZE, flexShrink: 0, textAlign: 'center' }}>
    <Stack>
      <StackItem>
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{ default: 'justifyContentCenter' }}
          style={{ minHeight: '2.8em' }}
        >
          <FlexItem>
            <Content component={ContentVariants.small}>{label}</Content>
          </FlexItem>
        </Flex>
      </StackItem>
      <StackItem>{children}</StackItem>
    </Stack>
  </FlexItem>
);

export const BorrowLendBadge: React.FC<BorrowLendBadgeProps> = ({
  type,
  count,
  models,
  perModelGpus = [],
  counterpartCQNames = [],
}) => {
  const isBorrowed = type === 'borrowed';
  const directionLabel = isBorrowed ? 'From' : 'To';

  const perModelRows = isBorrowed
    ? perModelGpus
        .filter((m) => (m.borrowed ?? 0) > 0)
        .map((m) => (
          <Content key={m.model} component={ContentVariants.small}>
            {m.borrowed ?? 0} × {m.model}
          </Content>
        ))
    : perModelGpus
        .filter((m) => m.nominal - m.used > 0)
        .map((m) => (
          <Content key={m.model} component={ContentVariants.small}>
            {m.nominal - m.used} × {m.model}
          </Content>
        ));

  const fallbackRow = (
    <Content component={ContentVariants.small}>
      {count} × {models.length > 0 ? models.join(', ') : count === 1 ? 'GPU' : 'GPUs'}
    </Content>
  );

  return (
    <Popover
      headerContent={isBorrowed ? 'Borrowed capacity' : 'Lent capacity'}
      bodyContent={
        <Stack hasGutter>
          {counterpartCQNames.length > 0 && (
            <StackItem>
              {counterpartCQNames.map((cqName) => (
                <Content key={cqName} component={ContentVariants.small}>
                  {directionLabel}: <strong>{cqName}</strong>
                </Content>
              ))}
            </StackItem>
          )}
          <StackItem>{perModelRows.length > 0 ? perModelRows : fallbackRow}</StackItem>
        </Stack>
      }
    >
      <Label
        color={isBorrowed ? 'orange' : 'purple'}
        isCompact
        onClick={() => undefined}
        data-testid={`cq-${type}-badge`}
      >
        {isBorrowed ? `+${count} borrowed` : `${count} lent`}
      </Label>
    </Popover>
  );
};

export const DcgmDonut: React.FC<DcgmDonutProps> = ({
  percentage,
  ariaLabel,
  borrowLendInfo,
  perModelData = [],
  testId,
}) => {
  if (percentage === null) {
    return (
      <Bullseye style={{ height: CQ_DONUT_SIZE, width: CQ_DONUT_SIZE }} data-testid={testId}>
        <Spinner size="md" aria-label={`Loading ${ariaLabel}`} />
      </Bullseye>
    );
  }

  if (percentage === undefined) {
    return (
      <Bullseye style={{ height: CQ_DONUT_SIZE, width: CQ_DONUT_SIZE }} data-testid={testId}>
        <ChartDonutUtilization
          ariaTitle={`${ariaLabel}: 0%`}
          constrainToVisibleArea
          data={{ x: ariaLabel, y: 0 }}
          height={CQ_DONUT_SIZE}
          width={CQ_DONUT_SIZE}
          innerRadius={CQ_DONUT_INNER_RADIUS}
          labels={() => 'No telemetry data'}
          title="0%"
          subTitle="utilization"
          titleComponent={TITLE_LABEL}
          subTitleComponent={SUBTITLE_LABEL}
          name={`dcgm-${ariaLabel}`}
        />
      </Bullseye>
    );
  }

  if (borrowLendInfo) {
    if (borrowLendInfo.isBorrowing) {
      const fillPct = Math.min(percentage, 99.9); // avoid full-circle SVG edge case at 100
      return (
        <Bullseye style={{ height: CQ_DONUT_SIZE, width: CQ_DONUT_SIZE }} data-testid={testId}>
          <ChartDonutThreshold
            ariaTitle={`${ariaLabel} (borrowed)`}
            constrainToVisibleArea
            data={[{ x: AcceleratorSegment.Own, y: 100 }]}
            colorScale={[chartColorBlue.value]}
            height={CQ_DONUT_SIZE}
            width={CQ_DONUT_SIZE}
            name={`dcgm-${ariaLabel}`}
            labels={() => buildDcgmOwnTooltip(percentage, perModelData)}
          >
            <ChartDonutUtilization
              data={{ x: AcceleratorSegment.Borrowed, y: fillPct }}
              thresholds={[{ value: 0, color: chartColorOrange.value }]}
              labels={({ datum }) =>
                datum.x === AcceleratorSegment.Borrowed
                  ? buildDcgmBorrowedTooltip(datum.y, perModelData)
                  : `Own: ${Math.round(datum.y)}%`
              }
              title={`${Math.round(percentage)}%`}
              subTitle="utilization"
              titleComponent={TITLE_LABEL}
              subTitleComponent={SUBTITLE_LABEL}
            />
          </ChartDonutThreshold>
        </Bullseye>
      );
    }

    // Lent: proportional ring — Own / Lent / Available segments.
    const { chartData } = computeDcgmSplitData(percentage, borrowLendInfo);
    // Map colors by segment name so filtering zero-value segments doesn't shift colors.
    const chartColorScale = chartData.map((d) => SEGMENT_COLORS[d.x] ?? chartColorGray.value);

    return (
      <Bullseye style={{ height: CQ_DONUT_SIZE, width: CQ_DONUT_SIZE }} data-testid={testId}>
        <ChartDonut
          ariaTitle={`${ariaLabel} (lent)`}
          constrainToVisibleArea
          data={chartData}
          colorScale={chartColorScale}
          labels={({ datum }) => {
            if (datum.x === AcceleratorSegment.Available || datum.x === AcceleratorSegment.NoData) {
              return `Available: ${Math.round(datum.y)}%`;
            }
            if (datum.x === AcceleratorSegment.Lent) {
              return buildDcgmLentTooltip(datum.y, perModelData);
            }
            return `Own: ${Math.round(datum.y)}%`;
          }}
          height={CQ_DONUT_SIZE}
          width={CQ_DONUT_SIZE}
          innerRadius={CQ_DONUT_INNER_RADIUS}
          title={`${Math.round(percentage)}%`}
          subTitle="utilization"
          titleComponent={TITLE_LABEL}
          subTitleComponent={SUBTITLE_LABEL}
          name={`dcgm-${ariaLabel}`}
        />
      </Bullseye>
    );
  }

  // Normal single-colour utilisation ring.
  return (
    <Bullseye style={{ height: CQ_DONUT_SIZE, width: CQ_DONUT_SIZE }} data-testid={testId}>
      <ChartDonutUtilization
        ariaTitle={ariaLabel}
        constrainToVisibleArea
        data={{ x: ariaLabel, y: percentage }}
        height={CQ_DONUT_SIZE}
        width={CQ_DONUT_SIZE}
        innerRadius={CQ_DONUT_INNER_RADIUS}
        labels={({ datum }) =>
          datum.x === ariaLabel ? `${ariaLabel}: ${percentage}%` : `Available: ${100 - percentage}%`
        }
        title={`${percentage}%`}
        subTitle="utilization"
        titleComponent={TITLE_LABEL}
        subTitleComponent={SUBTITLE_LABEL}
        name={`dcgm-${ariaLabel}`}
      />
    </Bullseye>
  );
};
