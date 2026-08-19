import * as React from 'react';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import LlmAcceleratorConfigListView from './LlmAcceleratorConfigListView';
import LlmAcceleratorConfigEmptyState from './LlmAcceleratorConfigEmptyState';
import { LlmAcceleratorConfigContext } from './LlmAcceleratorConfigContext';

const LlmAcceleratorConfigView: React.FC = () => {
  const { configs } = React.useContext(LlmAcceleratorConfigContext);

  return (
    <ApplicationsPage
      title="LLM accelerator configurations"
      noTitle
      description="Manage accelerator configurations for LLM inference service deployments. Enabled configurations are available in the deployment wizard."
      loaded
      empty={configs.length === 0}
      emptyStatePage={<LlmAcceleratorConfigEmptyState />}
      provideChildrenPadding
    >
      <LlmAcceleratorConfigListView />
    </ApplicationsPage>
  );
};

export default LlmAcceleratorConfigView;
