import React from 'react';
import type { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { ModelDeploymentsContext } from '../src/concepts/ModelDeploymentsContext';
import type { Deployment } from '../extension-points';

const useDeployments = (): {
  deployments?: Deployment[];
  loaded: boolean;
  errors?: Error[];
  projects?: ProjectKind[];
} => {
  const { deployments, loaded, errors, projects } = React.useContext(ModelDeploymentsContext);

  return {
    deployments,
    loaded,
    errors,
    projects,
  };
};

export default useDeployments;
