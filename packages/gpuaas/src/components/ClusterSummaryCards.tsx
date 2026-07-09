import * as React from 'react';
import {
  Bullseye,
  Card,
  CardBody,
  CardTitle,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  Spinner,
} from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import { ChartDonutUtilization } from '@patternfly/react-charts/victory';
import { ClusterMetrics } from '../hooks/useInfrastructureMetrics';
import './ClusterSummaryCards.scss';

type ClusterSummaryCardsProps = {
  metrics: ClusterMetrics;
};

const CHART_HEIGHT = 230;
const CHART_WIDTH = 230;
const INNER_RADIUS = 100;

const ClusterSummaryCards: React.FC<ClusterSummaryCardsProps> = ({ metrics }) => {
  const { accelerators, computeUtilization, memoryUtilization, loaded, error } = metrics;

  if (!loaded) {
    return (
      <Bullseye className="gpuaas-cluster-spinner">
        <Spinner />
      </Bullseye>
    );
  }

  if (error) {
    return (
      <EmptyState
        headingLevel="h4"
        icon={CubesIcon}
        titleText="Error loading metrics"
        variant={EmptyStateVariant.sm}
        data-testid="cluster-metrics-error"
      >
        <EmptyStateBody>{error.message}</EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <Grid hasGutter>
      <GridItem sm={12} md={6} lg={4}>
        <TotalAcceleratorsCard accelerators={accelerators} />
      </GridItem>
      <GridItem sm={12} md={6} lg={4}>
        <ComputeUtilizationCard utilization={computeUtilization} />
      </GridItem>
      <GridItem sm={12} md={6} lg={4}>
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
        <CardTitle>
          <Flex justifyContent={{ default: 'justifyContentCenter' }}>
            <FlexItem>Total accelerators</FlexItem>
          </Flex>
        </CardTitle>
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
      <CardTitle>
        <Flex justifyContent={{ default: 'justifyContentCenter' }}>
          <FlexItem>Total accelerators</FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <Bullseye>
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
        </Bullseye>
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
        <CardTitle>
          <Flex justifyContent={{ default: 'justifyContentCenter' }}>
            <FlexItem>Avg. compute utilization</FlexItem>
          </Flex>
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
    <Card isFullHeight data-testid="cluster-card-compute-utilization">
      <CardTitle>
        <Flex justifyContent={{ default: 'justifyContentCenter' }}>
          <FlexItem>Avg. compute utilization</FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <Bullseye>
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
        </Bullseye>
      </CardBody>
    </Card>
  );
};

const MemoryUtilizationCard: React.FC<UtilizationCardProps> = ({ utilization }) => {
  if (!utilization) {
    return (
      <Card isFullHeight data-testid="cluster-card-memory-utilization">
        <CardTitle>
          <Flex justifyContent={{ default: 'justifyContentCenter' }}>
            <FlexItem>Avg. accelerator memory utilization</FlexItem>
          </Flex>
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
      <CardTitle>
        <Flex justifyContent={{ default: 'justifyContentCenter' }}>
          <FlexItem>Avg. accelerator memory utilization</FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <Bullseye>
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
        </Bullseye>
      </CardBody>
    </Card>
  );
};

export default ClusterSummaryCards;
