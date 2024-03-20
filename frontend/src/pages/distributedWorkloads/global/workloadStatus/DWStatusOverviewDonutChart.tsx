import * as React from 'react';
import { Card, CardTitle, CardBody, Bullseye, Spinner } from '@patternfly/react-core';
import { ChartDonut, ChartThemeColor } from '@patternfly/react-charts';
import EmptyStateErrorMessage from '~/components/EmptyStateErrorMessage';
import { DistributedWorkloadsContext } from '~/concepts/distributedWorkloads/DistributedWorkloadsContext';
import {
  WorkloadStatusColorAndIcon,
  WorkloadStatusType,
  getStatusCounts,
} from '~/concepts/distributedWorkloads/utils';

export const DWStatusOverviewDonutChart: React.FC = () => {
  const { workloads } = React.useContext(DistributedWorkloadsContext);

  const statusCounts = React.useMemo(() => getStatusCounts(workloads.data), [workloads.data]);

  if (workloads.error) {
    return (
      <Card isFullHeight>
        <EmptyStateErrorMessage
          title="Error loading workloads"
          bodyText={workloads.error.message}
        />
      </Card>
    );
  }

  if (!workloads.loaded) {
    return (
      <Card isFullHeight>
        <Bullseye style={{ minHeight: 150 }}>
          <Spinner />
        </Bullseye>
      </Card>
    );
  }

  return (
    <Card isFullHeight>
      <CardTitle>Status overview</CardTitle>
      <CardBody style={{ maxHeight: 280 }}>
        <Bullseye>
          <ChartDonut
            ariaDesc="Workload status overview"
            ariaTitle="Status overview donut chart"
            constrainToVisibleArea
            data={Object.keys(statusCounts).map((statusType) => ({
              x: statusType,
              y: statusCounts[statusType as WorkloadStatusType],
            }))}
            labels={({ datum }) => `${datum.x}: ${datum.y}`}
            legendData={(Object.keys(statusCounts) as (keyof typeof statusCounts)[]).map(
              (statusType) => ({
                name: `${statusType}: ${statusCounts[statusType]}`,
              }),
            )}
            colorScale={Object.keys(statusCounts).map(
              (statusType) =>
                WorkloadStatusColorAndIcon[statusType as WorkloadStatusType].chartColor ||
                WorkloadStatusColorAndIcon.Unknown.chartColor,
            )}
            legendOrientation="vertical"
            legendPosition="right"
            name="status-overview"
            padding={{
              bottom: 20,
              left: 20,
              right: 140, // Adjusted to accommodate legend
              top: 20,
            }}
            subTitle="Workloads"
            title={String(workloads.data.length)}
            themeColor={ChartThemeColor.multiOrdered}
            width={300}
          />
        </Bullseye>
      </CardBody>
    </Card>
  );
};
