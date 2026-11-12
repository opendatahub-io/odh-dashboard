import * as React from 'react';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import LlmInferenceServiceConfigListView from './LlmInferenceServiceConfigListView';
import LlmInferenceServiceConfigEmptyState from './LlmInferenceServiceConfigEmptyState';
import { LlmInferenceServiceConfigContext } from './LlmInferenceServiceConfigContext';

const LlmInferenceServiceConfigView: React.FC = () => {
  const { configs } = React.useContext(LlmInferenceServiceConfigContext);

  return (
    <ApplicationsPage
      title="LLM inference service configurations"
      noTitle
      description="Manage inference service configurations for LLM inference service deployments. Enabled configurations are available in the deployment wizard."
      loaded
      empty={configs.length === 0}
      emptyStatePage={<LlmInferenceServiceConfigEmptyState />}
      provideChildrenPadding
    >
      <LlmInferenceServiceConfigListView />
    </ApplicationsPage>
  );
};

export default LlmInferenceServiceConfigView;
