import * as React from 'react';
import { Card, CardBody, CardTitle, Gallery, GalleryItem } from '@patternfly/react-core';
import {
  ChartLegend,
  ChartLabel,
  ChartDonut,
  ChartThemeColor,
  ChartTooltip,
} from '@patternfly/react-charts/victory';
import { DistributedWorkloadsContext } from '#~/concepts/distributedWorkloads/DistributedWorkloadsContext';
import {
  TopWorkloadUsageType,
  WorkloadStatusType,
  getStatusInfo,
  getWorkloadName,
} from '#~/concepts/distributedWorkloads/utils';
import EmptyStateErrorMessage from '#~/components/EmptyStateErrorMessage';
import { LoadingState } from '#~/pages/distributedWorkloads/components/LoadingState';
import { NoWorkloadState } from '#~/pages/distributedWorkloads/components/NoWorkloadState';
import { truncateString } from '#~/utilities/string';
import { bytesAsPreciseGiB, roundNumber } from '#~/utilities/number';

interface TopResourceConsumingWorkloadsChartProps {
  metricLabel: string;
  unitLabel: string;
  data: TopWorkloadUsageType;
  convertUnits?: (num?: number) => number;
}

const TopResourceConsumingWorkloadsChart: React.FC<TopResourceConsumingWorkloadsChartProps> = ({
  metricLabel,
  unitLabel,
  data,
  convertUnits = (num) => num || 0,
}) => {
  const [extraWidth, setExtraWidth] = React.useState(0);
  const chartBaseWidth = 375;
  const legendBaseWidth = 260;
  const chartHeight = 150;
  const containerRef = React.useRef<HTMLDivElement>(null);
  const updateWidth = () => {
    if (containerRef.current) {
      setExtraWidth(Math.max(chartBaseWidth, containerRef.current.clientWidth) - chartBaseWidth);
    }
  };
  React.useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    const resizeObserver = new ResizeObserver(() => {
      updateWidth();
    });
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);
  const { topWorkloads, otherUsage, totalUsage } = data;

  return (
    <div ref={containerRef} style={{ height: `${chartHeight}px` }}>
      <ChartDonut
        constrainToVisibleArea
        labelRadius={50}
        labelComponent={
          <ChartTooltip
            center={{ x: 225, y: 0 }}
            constrainToVisibleArea
            pointerOrientation="left"
          />
        }
        height={chartHeight}
        ariaTitle={`${metricLabel} chart`}
        data={
          topWorkloads.length
            ? [
                ...topWorkloads.map(({ workload, usage }) => ({
                  x: getWorkloadName(workload),
                  y: roundNumber(convertUnits(usage), 3),
                })),
                ...(otherUsage
                  ? [{ x: 'Other', y: roundNumber(convertUnits(otherUsage), 3) }]
                  : []),
              ]
            : [{ x: `No workload is consuming ${unitLabel}`, y: 1 }]
        }
        labels={
          topWorkloads.length
            ? ({ datum }) => `${datum.x}: ${datum.y} ${unitLabel}`
            : ({ datum }) => datum.x
        }
        legendComponent={
          <ChartLegend
            data={[
              ...topWorkloads.map(({ workload }) => ({
                name: truncateString(getWorkloadName(workload), 13 + extraWidth / 15),
              })),
              ...(otherUsage ? [{ name: 'Other' }] : []),
            ]}
            gutter={15}
            labelComponent={<ChartLabel style={{ fontSize: 14 }} />}
            itemsPerRow={Math.ceil(topWorkloads.length / 2)}
          />
        }
        legendOrientation="vertical"
        legendPosition="right"
        name={`topResourceConsuming${metricLabel}`}
        padding={{
          bottom: 0,
          left: 0,
          right: legendBaseWidth + extraWidth,
          top: 0,
        }}
        subTitle={unitLabel}
        title={String(roundNumber(convertUnits(totalUsage)))}
        themeColor={topWorkloads.length ? ChartThemeColor.multi : ChartThemeColor.gray}
        width={chartBaseWidth + extraWidth}
      />
    </div>
  );
};

export const TopResourceConsumingWorkloads: React.FC = () => {
  const { workloads, projectCurrentMetrics } = React.useContext(DistributedWorkloadsContext);
  const { topWorkloadsByUsage } = projectCurrentMetrics;
  const requiredFetches = [workloads, projectCurrentMetrics];
  const error = requiredFetches.find((f) => !!f.error)?.error;
  const loaded = requiredFetches.every((f) => f.loaded);

  if (error) {
    return <EmptyStateErrorMessage title="Error loading workloads" bodyText={error.message} />;
  }

  if (!loaded) {
    return <LoadingState />;
  }

  if (
    !topWorkloadsByUsage.cpuCoresUsed.totalUsage &&
    !topWorkloadsByUsage.memoryBytesUsed.totalUsage
  ) {
    const workloadStatuses = [];
    if (workloads.data.some((wl) => getStatusInfo(wl).status === WorkloadStatusType.Succeeded)) {
      workloadStatuses.push('completed');
    }
    if (workloads.data.some((wl) => getStatusInfo(wl).status === WorkloadStatusType.Failed)) {
      workloadStatuses.push('failed');
    }

    if (workloadStatuses.length) {
      return (
        <NoWorkloadState
          warn={workloadStatuses.includes('failed')}
          title={`All distributed workloads have ${workloadStatuses.join(' or ')}`}
        />
      );
    }
    return <NoWorkloadState />;
  }

  return (
    <Gallery minWidths={{ default: '100%', xl: '50%' }}>
      <GalleryItem>
        <Card isPlain isCompact>
          <CardTitle>CPU</CardTitle>
          <CardBody>
            <TopResourceConsumingWorkloadsChart
              metricLabel="CPU"
              unitLabel="cores"
              data={topWorkloadsByUsage.cpuCoresUsed}
            />
          </CardBody>
        </Card>
      </GalleryItem>
      <GalleryItem>
        <Card isPlain isCompact>
          <CardTitle>Memory</CardTitle>
          <CardBody>
            <TopResourceConsumingWorkloadsChart
              metricLabel="Memory"
              unitLabel="GiB"
              data={topWorkloadsByUsage.memoryBytesUsed}
              convertUnits={bytesAsPreciseGiB}
            />
          </CardBody>
        </Card>
      </GalleryItem>
    </Gallery>
  );
};
