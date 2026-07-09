import React from 'react';
import { EmptyState, EmptyStateBody } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';

const EmptyExternalModelsPage: React.FC = () => (
  <EmptyState
    titleText="No external models"
    headingLevel="h3"
    variant="lg"
    data-testid="empty-external-models-page"
    icon={PlusCircleIcon}
  >
    <EmptyStateBody>
      Add external model endpoints to make off-cluster models available through the inference
      gateway. Configure external providers to connect to OpenAI, Anthropic, AWS Bedrock, and other
      hosted model APIs.
    </EmptyStateBody>
  </EmptyState>
);

export default EmptyExternalModelsPage;
