import * as React from 'react';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import LlmAcceleratorConfigListView from './LlmAcceleratorConfigListView';
import { LlmAcceleratorConfigContext } from './LlmAcceleratorConfigContext';

const LlmAcceleratorConfigView: React.FC = () => {
  const { configs } = React.useContext(LlmAcceleratorConfigContext);

  return (
    <ApplicationsPage
      title="LLM accelerator configurations"
      description="Manage accelerator configurations for LLM inference service deployments. Enabled configurations are available in the deployment wizard."
      loaded
      empty={configs.length === 0}
      provideChildrenPadding
    >
      <LlmAcceleratorConfigListView />
    </ApplicationsPage>
  );
};

export default LlmAcceleratorConfigView;
