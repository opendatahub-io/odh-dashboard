import * as React from 'react';
import { Card, CardTitle, CardBody, Bullseye, Spinner } from '@patternfly/react-core';
import { ChartDonut, ChartLegend } from '@patternfly/react-charts';
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
          title="Error loading distributed workloads"
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

  const statusTypesIncludedInLegend = Object.values(WorkloadStatusType);
  const statusTypesIncludedInChart = statusTypesIncludedInLegend.filter(
    (statusType) => statusCounts[statusType] > 0,
  );

  return (
    <Card isFullHeight data-testid="dw-status-overview-card">
      <CardTitle>Status overview</CardTitle>
      <CardBody style={{ maxHeight: 280 }}>
        <Bullseye>
          <ChartDonut
            ariaDesc="Distributed workload status overview"
            ariaTitle="Status overview donut chart"
            constrainToVisibleArea
            data={statusTypesIncludedInChart.map((statusType) => ({
              x: statusType,
              y: statusCounts[statusType],
            }))}
            labels={({ datum }) => `${datum.x}: ${datum.y}`}
            colorScale={statusTypesIncludedInChart.map(
              (statusType) => WorkloadStatusColorAndIcon[statusType].chartColor,
            )}
            legendComponent={
              <ChartLegend
                data={statusTypesIncludedInLegend.map((statusType) => ({
                  name: `${statusType}: ${statusCounts[statusType]}`,
                }))}
                colorScale={statusTypesIncludedInLegend.map(
                  (statusType) => WorkloadStatusColorAndIcon[statusType].chartColor,
                )}
                gutter={15}
                itemsPerRow={Math.ceil(statusTypesIncludedInLegend.length / 2)}
                rowGutter={0}
              />
            }
            legendOrientation="vertical"
            legendPosition="right"
            name="status-overview"
            padding={{
              bottom: 0,
              left: 0,
              right: 280, // Adjusted to accommodate legend
              top: 0,
            }}
            subTitle="Distributed Workloads"
            title={String(workloads.data.length)}
            width={450}
          />
        </Bullseye>
      </CardBody>
    </Card>
  );
};
