import React from 'react';
import { Button, EmptyState, EmptyStateBody, Stack, StackItem } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import { externalProvidersManagementPath } from '~/app/pages/external-providers/const';
import { createExternalModelPath } from './const';

const EmptyExternalModelsPage: React.FC<{ namespace: string }> = ({ namespace }) => (
  <EmptyState
    titleText="No external models"
    headingLevel="h3"
    variant="lg"
    data-testid="empty-external-models-page"
    icon={PlusCircleIcon}
  >
    <EmptyStateBody>
      <Stack hasGutter>
        <StackItem>
          External models enable you to route inference requests to off-cluster model providers
          through the MaaS gateway.
          <br />
          <br />
          To get started, register an external model and configure at least one provider reference.
          <br />
          <br />
          Once ready, it can be made accessible to consumers by setting up a subscription and
          authorization policy on the <strong>MaaS governance</strong> page. Consumers will also
          need an API key to send requests.
        </StackItem>
        <StackItem>
          <Button
            data-testid="add-external-model-button"
            variant="primary"
            component={(props) => <Link {...props} to={createExternalModelPath(namespace)} />}
          >
            Add external model
          </Button>
        </StackItem>
        <StackItem>
          <Button
            data-testid="manage-external-providers-button"
            variant="secondary"
            component={(props) => (
              <Link {...props} to={externalProvidersManagementPath(namespace)} />
            )}
          >
            Manage providers
          </Button>
        </StackItem>
      </Stack>
    </EmptyStateBody>
  </EmptyState>
);

export default EmptyExternalModelsPage;
