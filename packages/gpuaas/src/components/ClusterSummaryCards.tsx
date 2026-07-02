import * as React from 'react';
import {
  Bullseye,
  Card,
  CardBody,
  CardTitle,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Grid,
  GridItem,
  Spinner,
} from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import { ChartDonutUtilization } from '@patternfly/react-charts/victory';
import { ClusterMetrics } from '../hooks/useInfrastructureMetrics';

type ClusterSummaryCardsProps = {
  metrics: ClusterMetrics;
};

const CHART_HEIGHT = 230;
const CHART_WIDTH = 230;
const INNER_RADIUS = 100;

const ClusterSummaryCards: React.FC<ClusterSummaryCardsProps> = ({ metrics }) => {
  const { accelerators, computeUtilization, memoryUtilization, loaded } = metrics;

  if (!loaded) {
    return (
      <Bullseye style={{ minHeight: 150 }}>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <Grid hasGutter>
      <GridItem span={4}>
        <TotalAcceleratorsCard accelerators={accelerators} />
      </GridItem>
      <GridItem span={4}>
        <ComputeUtilizationCard utilization={computeUtilization} />
      </GridItem>
      <GridItem span={4}>
        <MemoryUtilizationCard utilization={memoryUtilization} />
      </GridItem>
    </Grid>
  );
};

type TotalAcceleratorsCardProps = {
  accelerators: ClusterMetrics['accelerators'];
};

const TotalAcceleratorsCard: React.FC<TotalAcceleratorsCardProps> = ({ accelerators }) => {
  if (!accelerators) {
    return (
      <Card isFullHeight data-testid="cluster-card-total-accelerators">
        <CardTitle className="pf-v6-u-text-align-center">Total accelerators</CardTitle>
        <CardBody>
          <EmptyState
            headingLevel="h4"
            icon={CubesIcon}
            titleText="No accelerator resources detected"
            variant={EmptyStateVariant.xs}
          >
            <EmptyStateBody>No accelerator resources were detected on this cluster.</EmptyStateBody>
          </EmptyState>
        </CardBody>
      </Card>
    );
  }

  const { total, inUse } = accelerators;
  const percentage = total > 0 ? Math.round((inUse / total) * 100) : 0;

  return (
    <Card isFullHeight data-testid="cluster-card-total-accelerators">
      <CardTitle className="pf-v6-u-text-align-center">Total accelerators</CardTitle>
      <CardBody className="pf-v6-u-display-flex pf-v6-u-justify-content-center">
        <ChartDonutUtilization
          ariaTitle="Total accelerator utilization"
          constrainToVisibleArea
          data={{ x: 'Accelerators in use', y: percentage }}
          height={CHART_HEIGHT}
          width={CHART_WIDTH}
          innerRadius={INNER_RADIUS}
          labels={({ datum }) =>
            datum.x === 'Accelerators in use'
              ? `Accelerators in use: ${percentage}%`
              : `Available: ${100 - percentage}%`
          }
          subTitle="Accelerators in use"
          title={`${inUse}/${total}`}
          name="total-accelerators"
        />
      </CardBody>
    </Card>
  );
};

type UtilizationCardProps = {
  utilization: ClusterMetrics['computeUtilization'];
};

const ComputeUtilizationCard: React.FC<UtilizationCardProps> = ({ utilization }) => {
  if (!utilization) {
    return (
      <Card isFullHeight data-testid="cluster-card-compute-utilization">
        <CardTitle className="pf-v6-u-text-align-center">Avg. compute utilization</CardTitle>
        <CardBody>
          <EmptyState
            headingLevel="h4"
            icon={CubesIcon}
            titleText="Utilization metrics unavailable"
            variant={EmptyStateVariant.xs}
          >
            <EmptyStateBody>
              Install a supported GPU operator for detailed telemetry.
            </EmptyStateBody>
          </EmptyState>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card isFullHeight data-testid="cluster-card-compute-utilization">
      <CardTitle className="pf-v6-u-text-align-center">Avg. compute utilization</CardTitle>
      <CardBody className="pf-v6-u-display-flex pf-v6-u-justify-content-center">
        <ChartDonutUtilization
          ariaTitle="Average compute utilization"
          constrainToVisibleArea
          data={{ x: 'Compute', y: utilization.percentage }}
          height={CHART_HEIGHT}
          width={CHART_WIDTH}
          innerRadius={INNER_RADIUS}
          labels={({ datum }) =>
            datum.x === 'Compute'
              ? `Compute: ${utilization.percentage}%`
              : `Available: ${100 - utilization.percentage}%`
          }
          subTitle="utilization"
          title={`${utilization.percentage}%`}
          name="compute-utilization"
        />
      </CardBody>
    </Card>
  );
};

const MemoryUtilizationCard: React.FC<UtilizationCardProps> = ({ utilization }) => {
  if (!utilization) {
    return (
      <Card isFullHeight data-testid="cluster-card-memory-utilization">
        <CardTitle className="pf-v6-u-text-align-center">
          Avg. accelerator memory utilization
        </CardTitle>
        <CardBody>
          <EmptyState
            headingLevel="h4"
            icon={CubesIcon}
            titleText="Utilization metrics unavailable"
            variant={EmptyStateVariant.xs}
          >
            <EmptyStateBody>
              Install a supported GPU operator for detailed telemetry.
            </EmptyStateBody>
          </EmptyState>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card isFullHeight data-testid="cluster-card-memory-utilization">
      <CardTitle className="pf-v6-u-text-align-center">
        Avg. accelerator memory utilization
      </CardTitle>
      <CardBody className="pf-v6-u-display-flex pf-v6-u-justify-content-center">
        <ChartDonutUtilization
          ariaTitle="Average accelerator memory utilization"
          constrainToVisibleArea
          data={{ x: 'Memory', y: utilization.percentage }}
          height={CHART_HEIGHT}
          width={CHART_WIDTH}
          innerRadius={INNER_RADIUS}
          labels={({ datum }) =>
            datum.x === 'Memory'
              ? `Memory: ${utilization.percentage}%`
              : `Available: ${100 - utilization.percentage}%`
          }
          subTitle="utilization"
          title={`${utilization.percentage}%`}
          name="memory-utilization"
        />
      </CardBody>
    </Card>
  );
};

export default ClusterSummaryCards;
