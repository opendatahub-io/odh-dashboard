import * as React from 'react';
import { Card, CardBody, CardTitle, Gallery, GalleryItem } from '@patternfly/react-core';
import { ChartLegend, ChartLabel, ChartDonut, ChartThemeColor } from '@patternfly/react-charts';
import { DistributedWorkloadsContext } from '~/concepts/distributedWorkloads/DistributedWorkloadsContext';
import { WorkloadStatusType, getStatusInfo } from '~/concepts/distributedWorkloads/utils';
import { ErrorWorkloadState, LoadingWorkloadState, NoWorkloadState } from './SharedStates';

//TODO: next 4 utility functions to be replaced or moved into a utility class
const memoryBytesToGibStr = (bytes: number, excludeUnit = false): string => {
  const gib = bytes / 1073741824;
  return `${truncateNumberToStr(gib)}${excludeUnit ? '' : 'GiB'}`;
};

const numberToCoreStr = (num: number): string => `${truncateNumberToStr(num)} cores`;

const truncateNumberToStr = (num: number): string => {
  if (num > 0.001) {
    return String(parseFloat(num.toFixed(3)));
  }
  if (num === 0) {
    return '0';
  }
  return '< 0.001';
};

const truncateStr = (str: string, length: number): string => {
  if (str.length <= length) {
    return str;
  }
  return `${str.substring(0, length)}...`;
};

interface TopResourceConsumingWorkloadsChartProps {
  label: string;
  title: string;
  subTitle?: string;
  data: Array<{ name: string; usage: number }>;
  dataStrConverter: (num: number) => string;
}

const TopResourceConsumingWorkloadsChart: React.FC<TopResourceConsumingWorkloadsChartProps> = ({
  label,
  title,
  subTitle = '',
  data = [],
  dataStrConverter,
}) => (
  <ChartDonut
    ariaTitle={`${label} chart`}
    constrainToVisibleArea
    data={data.map((d: { name: string; usage: number }) => ({ x: d.name, y: d.usage }))}
    height={150}
    labels={({ datum }) => `${datum.x}: ${dataStrConverter(0 + datum.y)}`}
    legendComponent={
      <ChartLegend
        data={data.map((d: { name: string; usage: number }) => ({
          ...d,
          name: truncateStr(d.name, 16),
        }))}
        gutter={5}
        labelComponent={<ChartLabel style={{ fontSize: 10 }} />}
        itemsPerRow={Math.ceil(data.length / 2)}
      />
    }
    legendOrientation="vertical"
    legendPosition="right"
    name={`topResourceConsuming${label}`}
    padding={{
      bottom: 0,
      left: 0,
      right: 260, // Adjusted to accommodate legend
      top: 0,
    }}
    subTitle={subTitle}
    title={title}
    themeColor={ChartThemeColor.multi}
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
    return <ErrorWorkloadState message={error.message} />;
  }

  if (!loaded) {
    return <LoadingWorkloadState />;
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
              label="CPU"
              title={truncateNumberToStr(topWorkloadsByUsage.cpuCoresUsed.totalUsage)}
              subTitle="cores"
              data={topWorkloadsByUsage.cpuCoresUsed.topWorkloads.map((data) => ({
                name:
                  data.workload === 'other' ? 'other' : data.workload.metadata?.name || 'unnamed',
                usage: data.usage || 0,
              }))}
              dataStrConverter={numberToCoreStr}
            />
          </CardBody>
        </Card>
      </GalleryItem>
      <GalleryItem>
        <Card isPlain isCompact>
          <CardTitle>Memory</CardTitle>
          <CardBody>
            <TopResourceConsumingWorkloadsChart
              label="Memory"
              title={memoryBytesToGibStr(topWorkloadsByUsage.memoryBytesUsed.totalUsage, true)}
              subTitle="GiB"
              data={topWorkloadsByUsage.memoryBytesUsed.topWorkloads.map((data) => ({
                name:
                  data.workload === 'other' ? 'other' : data.workload.metadata?.name || 'unnamed',
                usage: data.usage || 0,
              }))}
              dataStrConverter={memoryBytesToGibStr}
            />
          </CardBody>
        </Card>
      </GalleryItem>
    </Gallery>
  );
};
