import * as React from 'react';
import { Route, Routes } from 'react-router-dom';
import AgentDeployWizardPage from '~/app/deployWizard/AgentDeployWizardPage';
import AgentOpsFederatedProviders from './AgentOpsFederatedProviders';
import ProjectsBridgeProviderWrapper from './components/ProjectsBridgeProviderWrapper';
import { GatewayContextProvider } from '~/app/context/GatewayContext';

const AgentDeployWizardRoutes: React.FC = () => (
  <AgentOpsFederatedProviders>
    <GatewayContextProvider>
      <ProjectsBridgeProviderWrapper>
        <Routes>
          <Route path="*" element={<AgentDeployWizardPage />} />
        </Routes>
      </ProjectsBridgeProviderWrapper>
    </GatewayContextProvider>
  </AgentOpsFederatedProviders>
);

export default AgentDeployWizardRoutes;
