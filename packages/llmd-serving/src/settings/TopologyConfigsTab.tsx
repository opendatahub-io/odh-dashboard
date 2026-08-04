import React from 'react';
import { EmptyState, EmptyStateBody, PageSection } from '@patternfly/react-core';

const TopologyConfigsTab: React.FC = () => (
  <PageSection hasBodyWrapper={false}>
    <EmptyState headingLevel="h2" titleText="llm-d topology configurations">
      <EmptyStateBody>
        llm-d topology configurations will be available here. This tab is under construction.
      </EmptyStateBody>
    </EmptyState>
  </PageSection>
);

export default TopologyConfigsTab;
