import * as React from 'react';
import { Route, Routes } from 'react-router-dom';
import AgentDeployWizardPage from '~/app/deployWizard/AgentDeployWizardPage';
import AgentOpsFederatedProviders from './AgentOpsFederatedProviders';
import ProjectsBridgeProviderWrapper from './components/ProjectsBridgeProviderWrapper';

const AgentDeployWizardRoutes: React.FC = () => (
  <AgentOpsFederatedProviders>
    <ProjectsBridgeProviderWrapper>
      <Routes>
        <Route path="*" element={<AgentDeployWizardPage />} />
      </Routes>
    </ProjectsBridgeProviderWrapper>
  </AgentOpsFederatedProviders>
);

export default AgentDeployWizardRoutes;
