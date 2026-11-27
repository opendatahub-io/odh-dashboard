import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import type { ClusterQueueKind } from '@odh-dashboard/k8s-core';
import useClusterQueue from '@odh-dashboard/ui-core/hooks/useClusterQueue';
import DeploymentResourcesTab from '../DeploymentResourcesTab';

jest.mock('@odh-dashboard/ui-core/hooks/useAssignedFlavor', () => jest.fn());
jest.mock('@odh-dashboard/ui-core/hooks/useClusterQueue');
jest.mock('../../../shared/kueue/useClusterQueueFromLocalQueue', () =>
  jest.fn(() => ({ clusterQueueName: 'test-cluster-queue', loaded: true })),
);

const renderResourcesTab = (spec: ClusterQueueKind['spec']) => {
  jest.mocked(useClusterQueue).mockReturnValue({
    clusterQueue: {
      apiVersion: 'kueue.x-k8s.io/v1beta2',
      kind: 'ClusterQueue',
      metadata: { name: 'test-cluster-queue' },
      spec,
    },
    loaded: true,
    error: undefined,
  });

  render(
    <DeploymentResourcesTab
      localQueueName="test-local-queue"
      namespace="test-project"
      deploymentName="test-model"
    />,
  );
};

describe('DeploymentResourcesTab', () => {
  it.each([{}, { cohortName: '' }])('should hide Quota source for queue spec %j', (spec) => {
    renderResourcesTab(spec);

    expect(screen.getByTestId('queue-value')).toHaveTextContent('test-cluster-queue');
    expect(screen.queryByTestId('quota-source-value')).not.toBeInTheDocument();
  });

  it('should display the ClusterQueue cohort name as the Quota source', () => {
    renderResourcesTab({ cohortName: 'test-cohort' });

    expect(screen.getByTestId('quota-source-value')).toHaveTextContent('test-cohort');
  });
});
