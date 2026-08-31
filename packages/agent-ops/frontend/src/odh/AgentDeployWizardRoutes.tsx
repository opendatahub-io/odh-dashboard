import * as React from 'react';
import AgentDeploymentDetailGate from '~/app/components/AgentDeploymentDetailGate';
import AgentDeployWizardPage from '~/app/deployWizard/AgentDeployWizardPage';
import AgentOpsFederatedProviders from './AgentOpsFederatedProviders';
import ProjectsBridgeProviderWrapper from './components/ProjectsBridgeProviderWrapper';

const AgentDeployWizardRoutes: React.FC = () => (
  <AgentOpsFederatedProviders>
    <ProjectsBridgeProviderWrapper>
      <AgentDeploymentDetailGate>
        <AgentDeployWizardPage />
      </AgentDeploymentDetailGate>
    </ProjectsBridgeProviderWrapper>
  </AgentOpsFederatedProviders>
);

export default AgentDeployWizardRoutes;
