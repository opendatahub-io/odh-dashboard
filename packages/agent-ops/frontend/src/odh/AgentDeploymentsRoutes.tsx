import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AgentDeploymentsCoreLoader from '~/app/pages/AgentDeploymentsCoreLoader';

type AgentDeploymentsRoutesProps = {
  getRedirectPath?: (namespace?: string) => string;
  embeddedProviderView?: boolean;
};

const AgentDeploymentsRoutes: React.FC<AgentDeploymentsRoutesProps> = ({
  getRedirectPath,
  embeddedProviderView = false,
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
      path=":namespace"
      element={
        <AgentDeploymentsCoreLoader
          getRedirectPath={getRedirectPath}
          embeddedProviderView={embeddedProviderView}
        />
      }
    />
    <Route path="*" element={<Navigate to="." replace />} />
  </Routes>
);

export default AgentDeploymentsRoutes;
