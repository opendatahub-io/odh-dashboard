import React from 'react';
import { QuestionCircleIcon } from '@patternfly/react-icons';
import {
  PageSection,
  EmptyState,
  EmptyStateVariant,
  EmptyStateIcon,
  Title,
} from '@patternfly/react-core';

const JupyterNotebooks: React.FC = () => {
  return (
    <PageSection isFilled>
      <EmptyState variant={EmptyStateVariant.full} data-test-id="empty-empty-state">
        <EmptyStateIcon icon={QuestionCircleIcon} />
        <Title headingLevel="h5" size="lg">
          Spawner page
        </Title>
      </EmptyState>
    </PageSection>
  );
};

export default JupyterNotebooks;
