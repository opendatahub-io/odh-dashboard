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
      <>
        External models enable you to route inference requests to off-cluster model providers
        through the MaaS gateway.
        <br />
        <br />
        To get started, add an external model with at least one provider reference via the CLI.
        <br />
        <br />
        Once ready, it can be made accessible to consumers by setting up a subscription and
        authorization policy on the <strong>MaaS governance</strong> page. Consumers will also need
        an API key to send requests.
      </>
    </EmptyStateBody>
  </EmptyState>
);

export default EmptyExternalModelsPage;
