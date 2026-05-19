import React from 'react';
import { PageSection, Title, EmptyState, EmptyStateBody } from '@patternfly/react-core';

const MainPage: React.FC = () => (
  <PageSection>
    <EmptyState>
      <Title headingLevel="h1" size="lg">
        Agent Ops
      </Title>
      <EmptyStateBody>Welcome to Agent Ops. This module is under construction.</EmptyStateBody>
    </EmptyState>
  </PageSection>
);

export default MainPage;
