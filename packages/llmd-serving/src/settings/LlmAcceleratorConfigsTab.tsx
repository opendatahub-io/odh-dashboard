import React from 'react';
import { EmptyState, EmptyStateBody, PageSection } from '@patternfly/react-core';

const LlmAcceleratorConfigsTab: React.FC = () => (
  <PageSection hasBodyWrapper={false}>
    <EmptyState headingLevel="h2" titleText="LLM accelerator configurations">
      <EmptyStateBody>
        LLM accelerator configurations will be available here. This tab is under construction.
      </EmptyStateBody>
    </EmptyState>
  </PageSection>
);

export default LlmAcceleratorConfigsTab;
