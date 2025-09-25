import React from 'react';
import { ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
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

  return (
    <ModelDeploymentsProvider projects={projects} labelSelectors={labelSelectors} mrName={mrName}>
      <ModelDeploymentsProviderContent>{children}</ModelDeploymentsProviderContent>
    </ModelDeploymentsProvider>
  );
};

export default DeploymentsContextProvider;
