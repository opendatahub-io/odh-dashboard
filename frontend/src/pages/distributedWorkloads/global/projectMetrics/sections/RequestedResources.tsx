import * as React from 'react';
import { CardBody, Gallery, GalleryItem } from '@patternfly/react-core';
import { ChartBullet, ChartLegend } from '@patternfly/react-charts';
import {
  chart_color_blue_300 as chartColorBlue300,
  chart_color_blue_100 as chartColorBlue100,
  chart_color_black_100 as chartColorBlack100,
  chart_color_orange_300 as chartColorOrange300,
} from '@patternfly/react-tokens';
import { DistributedWorkloadsContext } from '~/concepts/distributedWorkloads/DistributedWorkloadsContext';
import {
  getQueueRequestedResources,
  getTotalSharedQuota,
} from '~/concepts/distributedWorkloads/utils';
import { bytesAsPreciseGiB, roundNumber } from '~/utilities/number';
import { ErrorWorkloadState, LoadingWorkloadState } from './SharedStates';

type RequestedResourcesBulletChartProps = {
  title: string;
  subTitle: string;
  numRequestedByThisProject: number;
  numRequestedByAllProjects: number;
  numTotalSharedQuota: number;
};

const RequestedResourcesBulletChart: React.FC<RequestedResourcesBulletChartProps> = ({
  title,
  subTitle,
  numRequestedByThisProject,
  numRequestedByAllProjects,
  numTotalSharedQuota,
}) => {
  const { namespace } = React.useContext(DistributedWorkloadsContext);

  // Cap things at 110% total quota for display, but show real values in tooltips
  const maxDomain = numTotalSharedQuota * 1.1;
  // Warn at 150% total quota
  const warningThreshold = numTotalSharedQuota * 1.5;

  type CappedBulletChartDataItem = {
    name: string;
    color: string;
    tooltip?: string; // Falls back to `name: preciseValue` if omitted
    hideValueInLegend?: boolean;
    preciseValue: number;
    roundedValue: number;
    cappedValue: number;
  };
  const getDataItem = (
    args: Omit<CappedBulletChartDataItem, 'roundedValue' | 'cappedValue'>,
  ): CappedBulletChartDataItem => ({
    ...args,
    roundedValue: roundNumber(args.preciseValue),
    cappedValue: roundNumber(Math.min(args.preciseValue, maxDomain)),
  });

  const requestedByThisProjectData = getDataItem({
    name: `Requested by ${namespace}`,
    color: chartColorBlue300.value,
    preciseValue: numRequestedByThisProject,
  });
  const requestedByAllProjectsData = getDataItem({
    name: 'Requested by all projects',
    color: chartColorBlue100.value,
    preciseValue: numRequestedByAllProjects,
  });
  const totalSharedQuotaData = getDataItem({
    name: 'Total shared quota',
    color: chartColorBlack100.value,
    preciseValue: numTotalSharedQuota,
  });
  const warningThresholdData = getDataItem({
    name: 'Warning threshold (over 150%)',
    color: chartColorOrange300.value,
    tooltip: 'Requested resources have surpassed 150%',
    hideValueInLegend: true,
    preciseValue: warningThreshold,
  });

  const segmentedMeasureData = [requestedByThisProjectData, requestedByAllProjectsData];
  const qualitativeRangeData = [totalSharedQuotaData];

  const hasWarning = segmentedMeasureData.some(
    ({ preciseValue }) => preciseValue > warningThreshold,
  );
  const warningMeasureData = hasWarning ? [warningThresholdData] : [];

  const allData = [...segmentedMeasureData, ...qualitativeRangeData, ...warningMeasureData];
  return (
    <ChartBullet
      title={title}
      subTitle={subTitle}
      ariaTitle={`Requested ${title} ${subTitle}`}
      ariaDesc="Bullet chart"
      name={`requested-resources-chart-${title}`}
      labels={({ datum }) => {
        const matchingDataItem = allData.find(({ name }) => name === datum.name);
        return (
          matchingDataItem?.tooltip ||
          `${matchingDataItem?.name}: ${matchingDataItem?.preciseValue}`
        );
      }}
      primarySegmentedMeasureData={segmentedMeasureData.map(({ name, cappedValue }) => ({
        name,
        y: cappedValue,
      }))}
      qualitativeRangeData={qualitativeRangeData.map(({ name, cappedValue }) => ({
        name,
        y: cappedValue,
      }))}
      comparativeWarningMeasureData={warningMeasureData.map(({ name, cappedValue }) => ({
        name,
        y: cappedValue,
      }))}
      maxDomain={{ y: roundNumber(maxDomain) }}
      titlePosition="top-left"
      legendPosition="bottom-left"
      legendOrientation="vertical"
      legendComponent={
        <ChartLegend
          data={allData.map(({ name, hideValueInLegend, roundedValue }) => ({
            name: hideValueInLegend ? name : `${name}: ${roundedValue}`,
          }))}
          colorScale={allData.map(({ color }) => color)}
          gutter={30}
          itemsPerRow={3}
          rowGutter={0}
        />
      }
      constrainToVisibleArea
      height={250}
      width={600}
      padding={{
        bottom: 100, // Adjusted to accommodate legend
        left: 50,
        right: 50,
        top: 100, // Adjusted to accommodate labels
      }}
    />
  );
};

export const RequestedResources: React.FC = () => {
  const { localQueues, clusterQueue } = React.useContext(DistributedWorkloadsContext);
  const requiredFetches = [localQueues, clusterQueue];
  const error = requiredFetches.find((f) => !!f.error)?.error;
  const loaded = requiredFetches.every((f) => f.loaded);

  if (error) {
    return <ErrorWorkloadState message={error.message} />;
  }

  if (!loaded) {
    return <LoadingWorkloadState />;
  }

  const requestedByThisProject = getQueueRequestedResources(localQueues.data);
  const requestedByAllProjects = getQueueRequestedResources([clusterQueue.data]);
  const totalSharedQuota = getTotalSharedQuota(clusterQueue.data);

  return (
    <CardBody>
      <Gallery minWidths={{ default: '100%', md: '50%' }}>
        <GalleryItem data-testid="requested-resources-cpu-chart-container">
          <RequestedResourcesBulletChart
            title="CPU"
            subTitle="Cores"
            numRequestedByThisProject={requestedByThisProject.cpuCoresRequested}
            numRequestedByAllProjects={requestedByAllProjects.cpuCoresRequested}
            numTotalSharedQuota={totalSharedQuota.cpuCoresRequested}
          />
        </GalleryItem>
        <GalleryItem data-testid="requested-resources-memory-chart-container">
          <RequestedResourcesBulletChart
            title="Memory"
            subTitle="GiB"
            numRequestedByThisProject={bytesAsPreciseGiB(
              requestedByThisProject.memoryBytesRequested,
            )}
            numRequestedByAllProjects={bytesAsPreciseGiB(
              requestedByAllProjects.memoryBytesRequested,
            )}
            numTotalSharedQuota={bytesAsPreciseGiB(totalSharedQuota.memoryBytesRequested)}
          />
        </GalleryItem>
      </Gallery>
    </CardBody>
  );
};
