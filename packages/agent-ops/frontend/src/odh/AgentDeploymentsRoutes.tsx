import * as React from 'react';
import { Route, Routes } from 'react-router-dom';
import NotFound from '@odh-dashboard/ui-core/components/NotFound';
import AgentDeploymentsCoreLoader from '~/app/pages/AgentDeploymentsCoreLoader';

type AgentDeploymentsRoutesProps = {
  getRedirectPath?: (namespace?: string) => string;
  embeddedProviderView?: boolean;
  namespacePath?: string;
};

const AgentDeploymentsRoutes: React.FC<AgentDeploymentsRoutesProps> = ({
  getRedirectPath,
  embeddedProviderView = false,
  namespacePath = ':namespace',
}) => (
  <Routes>
    <Route
      index
      element={
        <AgentDeploymentsCoreLoader
          getRedirectPath={getRedirectPath}
          embeddedProviderView={embeddedProviderView}
        />
      }
    />
    <Route
      path={namespacePath}
      element={
        <AgentDeploymentsCoreLoader
          getRedirectPath={getRedirectPath}
          embeddedProviderView={embeddedProviderView}
        />
      }
    />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AgentDeploymentsRoutes;
