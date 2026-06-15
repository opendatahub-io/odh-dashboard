import React from 'react';
import { EmptyState, EmptyStateBody, PageSection } from '@patternfly/react-core';

const GeneralSettingsTab: React.FC = () => (
  <PageSection hasBodyWrapper={false}>
    <EmptyState headingLevel="h2" titleText="General settings">
      <EmptyStateBody>
        Model serving general settings will be available here. This tab is under construction.
      </EmptyStateBody>
    </EmptyState>
  </PageSection>
);

export default GeneralSettingsTab;
