import * as React from 'react';
import { Content, EmptyState, EmptyStateVariant, PageSection } from '@patternfly/react-core';
import { QuestionCircleIcon } from '@patternfly/react-icons';
import LlmAcceleratorConfigListView from './LlmAcceleratorConfigListView';
import { LlmAcceleratorConfigContext } from './LlmAcceleratorConfigContext';

const LlmAcceleratorConfigView: React.FC = () => {
  const { configs } = React.useContext(LlmAcceleratorConfigContext);

  return (
    <>
      <PageSection hasBodyWrapper={false}>
        <Content component="p">
          Manage accelerator configurations for LLM inference service deployments. Enabled
          configurations are available in the deployment wizard.
        </Content>
      </PageSection>
      {configs.length === 0 ? (
        <PageSection hasBodyWrapper={false} isFilled>
          <EmptyState
            headingLevel="h2"
            icon={QuestionCircleIcon}
            titleText="No LLM accelerator configurations"
            variant={EmptyStateVariant.lg}
          />
        </PageSection>
      ) : (
        <PageSection isFilled>
          <LlmAcceleratorConfigListView />
        </PageSection>
      )}
    </>
  );
};

export default LlmAcceleratorConfigView;
