import React from 'react';
import { ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { useModelRegistryFilter } from './useModelRegistryFilter';
import {
  ModelDeploymentsContext,
  ModelDeploymentsProvider,
} from '../src/concepts/ModelDeploymentsContext';
import { Deployment } from '../extension-points';

interface DeploymentsContextProviderProps {
  children: ({
    deployments,
    loaded,
  }: {
    deployments?: Deployment[];
    loaded: boolean;
  }) => React.ReactNode;
  labelSelectors?: { [key: string]: string };
  mrName?: string;
}

const ModelDeploymentsProviderContent: React.FC<{
  children: ({
    deployments,
    loaded,
  }: {
    deployments?: Deployment[];
    loaded: boolean;
  }) => React.ReactNode;
}> = ({ children }) => {
  const { deployments, loaded } = React.useContext(ModelDeploymentsContext);
  return <>{children({ deployments, loaded })}</>;
};

const DeploymentsContextProvider: React.FC<DeploymentsContextProviderProps> = ({
  children,
  labelSelectors,
  mrName,
}) => {
  const { projects } = React.useContext(ProjectsContext);
  const filterFn = useModelRegistryFilter(mrName);

  return (
    <ModelDeploymentsProvider
      projects={projects}
      labelSelectors={labelSelectors}
      filterFn={filterFn}
    >
      <ModelDeploymentsProviderContent>{children}</ModelDeploymentsProviderContent>
    </ModelDeploymentsProvider>
  );
};

export default DeploymentsContextProvider;
