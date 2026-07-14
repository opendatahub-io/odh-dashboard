import * as React from 'react';
import { Bullseye } from '@patternfly/react-core';
import {
  ChartDonut,
  ChartDonutThreshold,
  ChartDonutUtilization,
} from '@patternfly/react-charts/victory';
import {
  chart_color_black_300 as chartColorGray,
  chart_color_blue_300 as chartColorBlue,
  chart_color_purple_100 as chartColorPurple,
  chart_color_orange_100 as chartColorOrange,
} from '@patternfly/react-tokens';
import { SUBTITLE_LABEL, TITLE_LABEL } from './ClusterQueueChartComponents';
import {
  AcceleratorDonutConfig,
  AcceleratorDonutType,
  AcceleratorSegment,
  buildAcceleratorBorrowedLines,
  buildAcceleratorLentLines,
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

  if (config.type === AcceleratorDonutType.BorrowLend) {
    if (config.isBorrowing) {
      const nonZeroSegments = config.segments.filter((s) => s.y > 0);
      const totalSlots = nonZeroSegments.reduce((sum, s) => sum + s.y, 0);
      const borrowedSlots =
        nonZeroSegments.find((s) => s.x === AcceleratorSegment.Borrowed)?.y ?? 0;
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
            ariaTitle={`Accelerator utilization: ${config.title} (borrowed)`}
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
              labels={({ datum }) =>
                datum.x === AcceleratorSegment.Borrowed ? borrowedTooltip : ''
              }
              title={config.title}
              subTitle={'Accelerators\nin use'}
              titleComponent={TITLE_LABEL}
              subTitleComponent={SUBTITLE_LABEL}
            />
          </ChartDonutThreshold>
        </Bullseye>
      );
    }

    // Lent: proportional ring — Own (blue) + Lent (purple).
    const colorMap: Record<string, string> = {
      [AcceleratorSegment.Own]: chartColorBlue.value,
      [AcceleratorSegment.Lent]: chartColorPurple.value,
    };
    const visibleSegments = config.segments.filter((seg) => seg.y > 0);
    const chartData =
      visibleSegments.length > 0
        ? visibleSegments
        : [{ x: AcceleratorSegment.NoData, y: config.nominal }];
    const chartColorScale =
      visibleSegments.length > 0
        ? visibleSegments.map((seg) => colorMap[seg.x] ?? chartColorGray.value)
        : [chartColorGray.value];

    const ownTooltip = [
      `Total owned in use: ${config.used}`,
      buildAcceleratorOwnLines(perModelGpus),
    ]
      .filter(Boolean)
      .join('\n');

    const lentCount = config.segments.find((s) => s.x === AcceleratorSegment.Lent)?.y ?? 0;
    const lentTooltip = [`${lentCount} GPUs lent`, buildAcceleratorLentLines(perModelGpus)]
      .filter(Boolean)
      .join('\n');

    return (
      <Bullseye
        data-testid="accelerator-donut-chart"
        style={{ height: CQ_DONUT_SIZE, width: CQ_DONUT_SIZE }}
      >
        <ChartDonut
          ariaTitle={`Accelerator utilization: ${config.title} (lent)`}
          constrainToVisibleArea
          data={chartData}
          colorScale={chartColorScale}
          labels={({ datum }) => (datum.x === AcceleratorSegment.Own ? ownTooltip : lentTooltip)}
          height={CQ_DONUT_SIZE}
          width={CQ_DONUT_SIZE}
          innerRadius={CQ_DONUT_INNER_RADIUS}
          title={config.title}
          subTitle={'Accelerators\nin use'}
          titleComponent={TITLE_LABEL}
          subTitleComponent={SUBTITLE_LABEL}
          name={`accelerators-${cqName}`}
        />
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
        ariaTitle={`Accelerator utilization: ${config.used}/${config.nominal} (${config.percentage}%)`}
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
        subTitle={'Accelerators\nin use'}
        titleComponent={TITLE_LABEL}
        subTitleComponent={SUBTITLE_LABEL}
        name={`accelerators-${cqName}`}
      />
    </Bullseye>
  );
};

export default AcceleratorDonutChart;
