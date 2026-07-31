import React from 'react';
import { EmptyState, EmptyStateBody, PageSection } from '@patternfly/react-core';

const ServingRuntimeTemplatesTab: React.FC = () => (
  <PageSection hasBodyWrapper={false}>
    <EmptyState headingLevel="h2" titleText="Serving runtime templates">
      <EmptyStateBody>
        Serving runtime templates will be available here. This tab is under construction.
      </EmptyStateBody>
    </EmptyState>
  </PageSection>
);

export default ServingRuntimeTemplatesTab;
