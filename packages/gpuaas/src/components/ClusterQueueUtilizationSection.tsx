import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Spinner,
} from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import * as React from 'react';
import CohortAccordionGroup from './CohortAccordionGroup';
import useCohorts from '../hooks/useCohorts';
import useCQDcgmMetrics from '../hooks/useCQDcgmMetrics';
import useResourceFlavors from '../hooks/useResourceFlavors';
import { filterAcceleratorCQs } from '../utils/clusterQueueUtils';
import { resolveHardwareModels, resolvePerModelGpuCounts } from '../utils/hardwareModels';

const ClusterQueueUtilizationSection: React.FC = () => {
  const cohortsState = useCohorts();
  const resourceFlavorsState = useResourceFlavors();
  const dcgmMetrics = useCQDcgmMetrics();

  const loaded = cohortsState.loaded && resourceFlavorsState.loaded && dcgmMetrics.loaded;
  const error = cohortsState.error ?? resourceFlavorsState.error;

  const acceleratorCohorts = React.useMemo(
    () =>
      cohortsState.data.filter(
        (cohort) => filterAcceleratorCQs(cohort.memberClusterQueues).length > 0,
      ),
    [cohortsState.data],
  );

  const allAcceleratorCQs = React.useMemo(
    () => acceleratorCohorts.flatMap((c) => filterAcceleratorCQs(c.memberClusterQueues)),
    [acceleratorCohorts],
  );

  const hardwareModelsByCQ = React.useMemo(
    () => resolveHardwareModels(allAcceleratorCQs, resourceFlavorsState.data),
    [allAcceleratorCQs, resourceFlavorsState.data],
  );

  const perModelGpusByCQ = React.useMemo(
    () => resolvePerModelGpuCounts(allAcceleratorCQs, resourceFlavorsState.data),
    [allAcceleratorCQs, resourceFlavorsState.data],
  );

  if (error) {
    return (
      <EmptyState
        headingLevel="h4"
        icon={CubesIcon}
        titleText="Error loading cluster queue data"
        variant={EmptyStateVariant.sm}
        data-testid="cq-utilization-error"
      >
        <EmptyStateBody>{error.message}</EmptyStateBody>
      </EmptyState>
    );
  }

  if (!loaded) {
    return (
      <Bullseye data-testid="cq-utilization-loading">
        <Spinner />
      </Bullseye>
    );
  }

  if (acceleratorCohorts.length === 0) {
    return (
      <EmptyState
        headingLevel="h4"
        icon={CubesIcon}
        titleText="No accelerator cluster queues found"
        variant={EmptyStateVariant.sm}
        data-testid="cq-utilization-empty"
      >
        <EmptyStateBody>
          No cluster queues with accelerator resources were detected. Configure cluster queues with
          GPU resource quotas to see utilization here.
        </EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <CohortAccordionGroup
      cohorts={acceleratorCohorts}
      hardwareModelsByCQ={hardwareModelsByCQ}
      perModelGpusByCQ={perModelGpusByCQ}
      dcgmByModel={dcgmMetrics.dcgmAvailable ? dcgmMetrics.byModel : undefined}
    />
  );
};

export default ClusterQueueUtilizationSection;
