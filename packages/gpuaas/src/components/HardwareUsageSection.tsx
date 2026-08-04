import * as React from 'react';
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Spinner,
} from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import HardwareUsageChart from './HardwareUsageChart';
import type { ClusterMetrics } from '../hooks/useInfrastructureMetrics';

type HardwareUsageSectionProps = {
  metrics: ClusterMetrics;
};

const HardwareUsageSection: React.FC<HardwareUsageSectionProps> = ({ metrics }) => {
  const { hardwareUsage, hardwareLoaded, error } = metrics;

  if (!hardwareLoaded) {
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
        titleText="Error loading hardware usage data"
        variant={EmptyStateVariant.xs}
        data-testid="hardware-usage-error"
      >
        <EmptyStateBody>{error.message}</EmptyStateBody>
      </EmptyState>
    );
  }

  if (!hardwareUsage) {
    return (
      <EmptyState
        headingLevel="h4"
        icon={CubesIcon}
        titleText="Hardware model information unavailable"
        variant={EmptyStateVariant.xs}
        data-testid="hardware-usage-empty"
      >
        <EmptyStateBody>
          No hardware model data is available. Install a supported GPU operator for per-model
          breakdown.
        </EmptyStateBody>
      </EmptyState>
    );
  }

  return <HardwareUsageChart data={hardwareUsage} />;
};

export default HardwareUsageSection;
