import * as React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  PageSection,
  Title,
} from '@patternfly/react-core';
import { EDGE_CONSTANT, EDGE_UNIQUE_LABEL } from '~/concepts/edge/const';

const EmptyEdgePipelines: React.FC = () => (
  <PageSection isFilled>
    <EmptyState variant={EmptyStateVariant.xs} data-testid="edge-models-modal-empty-state">
      <Title headingLevel="h2" size="lg">
        No edge pipelines found
      </Title>
      <EmptyStateBody>{`An edge pipeline must be created in the ${EDGE_CONSTANT} namespace and have the label ${EDGE_UNIQUE_LABEL}`}</EmptyStateBody>
    </EmptyState>
  </PageSection>
);

export default EmptyEdgePipelines;
