import * as React from 'react';
import {
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateIcon,
  EmptyStateVariant,
  PageSection,
  Title,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import AddModelButton from '~/pages/edge/AddModelButton';

const EmptyEdgeModels: React.FC = () => (
  <PageSection isFilled>
    <EmptyState variant={EmptyStateVariant.lg}>
      <EmptyStateIcon icon={PlusCircleIcon} />
      <Title headingLevel="h1" size="lg">
        No models added
      </Title>
      <EmptyStateBody>
        To get started, add a model. Adding a model will also initiate a pipeline that will build
        the model and its dependencies into a container image and save that image in a container
        image registry.
      </EmptyStateBody>
      <EmptyStateFooter>
        <EmptyStateActions>
          <AddModelButton />
        </EmptyStateActions>
      </EmptyStateFooter>
    </EmptyState>
  </PageSection>
);

export default EmptyEdgeModels;
