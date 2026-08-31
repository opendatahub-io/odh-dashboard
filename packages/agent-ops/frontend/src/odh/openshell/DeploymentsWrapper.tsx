import * as React from 'react';
import { Route, Routes } from 'react-router-dom';
import NotFound from '@odh-dashboard/ui-core/components/NotFound';
import AgentDeployWizardRoutes from '~/odh/AgentDeployWizardRoutes';
import AgentDeploymentDetailRoutes from '~/odh/AgentDeploymentDetailRoutes';
import OpenShellProviders from './OpenShellProviders';
import ProviderLandingPage from './ProviderLandingPage';
import SandboxDetailWrapper from './SandboxDetailWrapper';
import SandboxesWrapper from './SandboxesWrapper';
import NativeSandboxesWrapper from './NativeSandboxesWrapper';

const DeploymentsWrapper: React.FC = () => (
  <Routes>
    <Route
      index
      element={
        <OpenShellProviders requireConnection={false}>
          <ProviderLandingPage />
        </OpenShellProviders>
      }
    />
    <Route path="providers/openshell" element={<SandboxesWrapper />} />
    <Route
      path="providers/openshell/workspaces/:workspace/sandboxes/:sandbox/*"
      element={<SandboxDetailWrapper />}
    />
    <Route
      path="providers/native/projects/:namespace/sandboxes/:agentId/*"
      element={<AgentDeploymentDetailRoutes />}
    />
    <Route
      path="providers/native/projects/:namespace/create"
      element={<AgentDeployWizardRoutes />}
    />
    <Route path="providers/native/*" element={<NativeSandboxesWrapper />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default DeploymentsWrapper;
