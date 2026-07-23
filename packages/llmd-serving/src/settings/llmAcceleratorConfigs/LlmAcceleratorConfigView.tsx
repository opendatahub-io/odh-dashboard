import * as React from 'react';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import LlmAcceleratorConfigListView from './LlmAcceleratorConfigListView';
import { LlmAcceleratorConfigContext } from './LlmAcceleratorConfigContext';

const LlmAcceleratorConfigView: React.FC = () => {
  const { configs } = React.useContext(LlmAcceleratorConfigContext);

  return (
    <ApplicationsPage
      title="LLM accelerator configurations"
      description="Manage your LLM accelerator configurations. Enabled configurations appear to deployers in the model serving wizard; out-of-the-box configurations can be disabled but not deleted."
      loaded
      empty={configs.length === 0}
      provideChildrenPadding
    >
      <LlmAcceleratorConfigListView />
    </ApplicationsPage>
  );
};

export default LlmAcceleratorConfigView;
