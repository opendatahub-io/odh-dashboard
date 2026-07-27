import * as React from 'react';
import { Bullseye } from '@patternfly/react-core';
import { ChartDonutThreshold, ChartDonutUtilization } from '@patternfly/react-charts/victory';
import {
  chart_color_blue_300 as chartColorBlue,
  chart_color_orange_100 as chartColorOrange,
} from '@patternfly/react-tokens';
import { SUBTITLE_LABEL, TITLE_LABEL } from './ClusterQueueChartComponents';
import {
  AcceleratorDonutConfig,
  AcceleratorDonutType,
  AcceleratorSegment,
  buildAcceleratorBorrowedLines,
  buildAcceleratorOwnLines,
} from '../utils/clusterQueueUtils';
import { CQ_DONUT_INNER_RADIUS, CQ_DONUT_SIZE } from '../const';
import { ModelGpuCount } from '../utils/hardwareModels';

type AcceleratorDonutChartProps = {
  config: AcceleratorDonutConfig;
  cqName: string;
  perModelGpus?: ModelGpuCount[];
};

const AcceleratorDonutChart: React.FC<AcceleratorDonutChartProps> = ({
  config,
  cqName,
  perModelGpus = [],
}) => {
  if (config.type === AcceleratorDonutType.None) {
    return null;
  }

  if (config.type === AcceleratorDonutType.Borrow) {
    const nonZeroSegments = config.segments.filter((s) => s.y > 0);
    const totalSlots = nonZeroSegments.reduce((sum, s) => sum + s.y, 0);
    const borrowedSlots = nonZeroSegments.find((s) => s.x === AcceleratorSegment.Borrowed)?.y ?? 0;
    const borrowedPct = totalSlots > 0 ? (borrowedSlots / totalSlots) * 100 : 0;

    const borrowedTooltip = [
      `Total borrowed in use: ${Math.round(borrowedPct)}%`,
      buildAcceleratorBorrowedLines(perModelGpus),
    ]
      .filter(Boolean)
      .join('\n');

    const ownUsed = config.used - borrowedSlots;
    // Pure borrowers have no owned capacity, skip per-model breakdown to avoid "6/0 in use" output
    const ownBorrowedTooltip = [
      `Total owned in use: ${ownUsed}`,
      ownUsed > 0 ? buildAcceleratorOwnLines(perModelGpus) : null,
    ]
      .filter(Boolean)
      .join('\n');

    return (
      <Bullseye
        data-testid="accelerator-donut-chart"
        style={{ height: CQ_DONUT_SIZE, width: CQ_DONUT_SIZE }}
      >
        <ChartDonutThreshold
          ariaTitle={`Accelerator consumption: ${config.title} (borrowed)`}
          constrainToVisibleArea
          data={[{ x: AcceleratorSegment.Own, y: ownUsed > 0 ? 100 : 0 }]}
          colorScale={[chartColorBlue.value]}
          height={CQ_DONUT_SIZE}
          width={CQ_DONUT_SIZE}
          name={`accelerators-${cqName}`}
          labels={() => ownBorrowedTooltip}
        >
          <ChartDonutUtilization
            data={{ x: AcceleratorSegment.Borrowed, y: borrowedPct }}
            thresholds={[{ value: 0, color: chartColorOrange.value }]}
            labels={({ datum }) => (datum.x === AcceleratorSegment.Borrowed ? borrowedTooltip : '')}
            title={config.title}
            subTitle="in use"
            titleComponent={TITLE_LABEL}
            subTitleComponent={SUBTITLE_LABEL}
          />
        </ChartDonutThreshold>
      </Bullseye>
    );
  }

  // Normal: single ChartDonutUtilization.
  const normalTooltip = [
    `Accelerators in use: ${config.percentage}%`,
    buildAcceleratorOwnLines(perModelGpus),
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <Bullseye
      data-testid="accelerator-donut-chart"
      style={{ height: CQ_DONUT_SIZE, width: CQ_DONUT_SIZE }}
    >
      <ChartDonutUtilization
        ariaTitle={`Accelerator consumption: ${config.used}/${config.nominal} (${config.percentage}%)`}
        constrainToVisibleArea
        data={{ x: 'Accelerators in use', y: config.percentage }}
        height={CQ_DONUT_SIZE}
        width={CQ_DONUT_SIZE}
        innerRadius={CQ_DONUT_INNER_RADIUS}
        labels={({ datum }) =>
          datum.x === 'Accelerators in use'
            ? normalTooltip
            : `Available: ${100 - config.percentage}%`
        }
        title={config.title}
        subTitle="in use"
        titleComponent={TITLE_LABEL}
        subTitleComponent={SUBTITLE_LABEL}
        name={`accelerators-${cqName}`}
      />
    </Bullseye>
  );
};

export default AcceleratorDonutChart;
