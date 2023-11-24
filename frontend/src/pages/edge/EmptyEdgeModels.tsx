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

const EmptyEdgeModels: React.FC = () => (
  <PageSection isFilled>
    <EmptyState variant={EmptyStateVariant.large}>
      <EmptyStateIcon icon={PlusCircleIcon} />
      <Title headingLevel="h1" size="lg">
        No models added
      </Title>
      <EmptyStateBody>
        To get started, add a model. Adding a model will also initiate a pipeline that will build
        the model and its dependencies into a container image and save that image in a container
        image registry.
      </EmptyStateBody>
    </EmptyState>
  </PageSection>
);

export default EmptyEdgeModels;
