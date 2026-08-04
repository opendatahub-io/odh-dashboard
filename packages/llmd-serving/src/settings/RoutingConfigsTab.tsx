import React from 'react';
import { EmptyState, EmptyStateBody, PageSection } from '@patternfly/react-core';

const RoutingConfigsTab: React.FC = () => (
  <PageSection hasBodyWrapper={false}>
    <EmptyState headingLevel="h2" titleText="llm-d routing configurations">
      <EmptyStateBody>
        llm-d routing configurations will be available here. This tab is under construction.
      </EmptyStateBody>
    </EmptyState>
  </PageSection>
);

export default RoutingConfigsTab;
