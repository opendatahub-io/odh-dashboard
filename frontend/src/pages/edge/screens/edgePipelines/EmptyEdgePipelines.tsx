import * as React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateVariant,
  PageSection,
  Title,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';

const EmptyEdgePipelines: React.FC = () => (
  <PageSection isFilled>
    <EmptyState variant={EmptyStateVariant.lg}>
      <EmptyStateIcon icon={PlusCircleIcon} />
      <Title headingLevel="h1" size="lg">
        No pipelines added
      </Title>
      <EmptyStateBody>
        Add a pipeline to start using ML Ops. Pipelines are reusable workflows that can be used to
        train and deploy models.
      </EmptyStateBody>
    </EmptyState>
  </PageSection>
);

export default EmptyEdgePipelines;
