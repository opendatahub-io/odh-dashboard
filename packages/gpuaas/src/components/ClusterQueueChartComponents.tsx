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
  ChartDonutThreshold,
  ChartDonutUtilization,
  ChartLabel,
} from '@patternfly/react-charts/victory';
import {
  chart_color_blue_300 as chartColorBlue,
  chart_color_orange_100 as chartColorOrange,
} from '@patternfly/react-tokens';
import {
  AcceleratorSegment,
  BorrowInfo,
  PerModelDcgmData,
  buildDcgmBorrowedTooltip,
  buildDcgmOwnTooltip,
} from '../utils/clusterQueueUtils';
import { ModelGpuCount } from '../utils/hardwareModels';
import { CQ_DONUT_INNER_RADIUS, CQ_DONUT_SIZE } from '../const';

export type { BorrowInfo, PerModelDcgmData };

type BorrowBadgeProps = {
  count: number;
  models: string[];
  perModelGpus?: ModelGpuCount[];
};

type DcgmDonutProps = {
  /**
   * null      = data loading (show spinner)
   * undefined = data loaded but unavailable for this model (show 0% ring)
   * number    = loaded value to render
   */
  percentage: number | null | undefined;
  ariaLabel: string;
  borrowInfo?: BorrowInfo;
  /** Per-GPU-model utilization for richer hover tooltips in borrowed state. */
  perModelData?: PerModelDcgmData[];
  testId?: string;
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

export const BorrowBadge: React.FC<BorrowBadgeProps> = ({ count, models, perModelGpus = [] }) => {
  const perModelRows = perModelGpus
    .filter((m) => (m.borrowed ?? 0) > 0)
    .map((m) => (
      <Content key={m.model} component={ContentVariants.small}>
        {m.borrowed ?? 0} × {m.model}
      </Content>
    ));

  const fallbackRow = (
    <Content component={ContentVariants.small}>
      {count} × {models.length > 0 ? models.join(', ') : count === 1 ? 'GPU' : 'GPUs'}
    </Content>
  );

  return (
    <Popover
      headerContent="Borrowed capacity"
      bodyContent={
        <Stack hasGutter>
          <StackItem>{perModelRows.length > 0 ? perModelRows : fallbackRow}</StackItem>
        </Stack>
      }
    >
      <Label color="orange" isCompact onClick={() => undefined} data-testid="cq-borrowed-badge">
        Borrowed: {count}
      </Label>
    </Popover>
  );
};

export const DcgmDonut: React.FC<DcgmDonutProps> = ({
  percentage,
  ariaLabel,
  borrowInfo,
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
          subTitle="consumption"
          titleComponent={TITLE_LABEL}
          subTitleComponent={SUBTITLE_LABEL}
          name={`dcgm-${ariaLabel}`}
        />
      </Bullseye>
    );
  }

  if (borrowInfo) {
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
            subTitle="consumption"
            titleComponent={TITLE_LABEL}
            subTitleComponent={SUBTITLE_LABEL}
          />
        </ChartDonutThreshold>
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
        subTitle="consumption"
        titleComponent={TITLE_LABEL}
        subTitleComponent={SUBTITLE_LABEL}
        name={`dcgm-${ariaLabel}`}
      />
    </Bullseye>
  );
};
