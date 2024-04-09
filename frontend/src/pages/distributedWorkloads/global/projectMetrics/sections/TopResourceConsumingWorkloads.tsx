import * as React from 'react';
import { Card, CardBody, CardTitle, Gallery, GalleryItem } from '@patternfly/react-core';
import { ChartLegend, ChartLabel, ChartDonut, ChartThemeColor } from '@patternfly/react-charts';
import { DistributedWorkloadsContext } from '~/concepts/distributedWorkloads/DistributedWorkloadsContext';
import { WorkloadStatusType, getStatusInfo } from '~/concepts/distributedWorkloads/utils';
import EmptyStateErrorMessage from '~/components/EmptyStateErrorMessage';
import { LoadingState } from '~/pages/distributedWorkloads/components/LoadingState';
import { NoWorkloadState } from '~/pages/distributedWorkloads/components/NoWorkloadState';
import { truncateString } from '~/utilities/string';
import { bytesAsPreciseGiB, roundNumber } from '~/utilities/number';
import { WorkloadWithUsage } from '~/api';
import { WorkloadKind } from '~/k8sTypes';

interface TopResourceConsumingWorkloadsChartProps {
  metricLabel: string;
  unitLabel: string;
  data: { totalUsage: number; topWorkloads: WorkloadWithUsage[] };
  convertUnits?: (num?: number) => number;
}

const getWorkloadName = (workload: WorkloadKind | 'other') =>
  workload === 'other' ? 'Other' : workload.metadata?.name || 'Unnamed';

const TopResourceConsumingWorkloadsChart: React.FC<TopResourceConsumingWorkloadsChartProps> = ({
  metricLabel,
  unitLabel,
  data,
  convertUnits = (num) => num || 0,
}) => (
  <ChartDonut
    ariaTitle={`${metricLabel} chart`}
    constrainToVisibleArea
    data={
      data.topWorkloads.length
        ? data.topWorkloads.map(({ workload, usage }) => ({
            x: getWorkloadName(workload),
            y: roundNumber(convertUnits(usage), 3),
          }))
        : [{ x: `No workload is consuming ${unitLabel}`, y: 1 }]
    }
    height={150}
    labels={
      data.topWorkloads.length
        ? ({ datum }) => `${datum.x}: ${datum.y} ${unitLabel}`
        : ({ datum }) => datum.x
    }
    legendComponent={
      <ChartLegend
        data={data.topWorkloads.map(({ workload }) => ({
          name: truncateString(getWorkloadName(workload), 16),
        }))}
        gutter={5}
        labelComponent={<ChartLabel style={{ fontSize: 10 }} />}
        itemsPerRow={Math.ceil(data.topWorkloads.length / 2)}
      />
    }
    legendOrientation="vertical"
    legendPosition="right"
    name={`topResourceConsuming${metricLabel}`}
    padding={{
      bottom: 0,
      left: 0,
      right: 260, // Adjusted to accommodate legend
      top: 0,
    }}
    subTitle={unitLabel}
    title={String(roundNumber(convertUnits(data.totalUsage)))}
    themeColor={data.topWorkloads.length ? ChartThemeColor.multi : ChartThemeColor.gray}
    width={375}
  />
);

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
    <Gallery minWidths={{ default: '100%', md: '50%' }}>
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
