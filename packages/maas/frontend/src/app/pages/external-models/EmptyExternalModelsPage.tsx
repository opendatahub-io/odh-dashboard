import React from 'react';
import { EmptyState, EmptyStateBody, Stack, StackItem, Button } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import {
  ExternalProvidersAddClickedProperties,
  MaaSEvents,
  ExternalProvidersAddSource,
  ExternalModelsManageProvidersSource,
  ExternalModelsManageProvidersClickedProperties,
} from '~/app/types/event-tracking';
import { externalProvidersManagementPath } from '~/app/pages/external-providers/const';
import { createExternalModelPath } from './const';

type EmptyExternalModelsPageProps = {
  namespace: string;
};

const EmptyExternalModelsPage: React.FC<EmptyExternalModelsPageProps> = ({ namespace }) => (
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
            onClick={() =>
              fireMiscTrackingEvent(MaaSEvents.EXTERNAL_MODELS_ADD_CLICKED, {
                source: ExternalProvidersAddSource.EMPTY_STATE,
              } satisfies ExternalProvidersAddClickedProperties)
            }
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
            onClick={() =>
              fireMiscTrackingEvent(MaaSEvents.EXTERNAL_MODELS_MANAGE_PROVIDERS_CLICKED, {
                source: ExternalModelsManageProvidersSource.EMPTY_STATE,
              } satisfies ExternalModelsManageProvidersClickedProperties)
            }
          >
            Manage providers
          </Button>
        </StackItem>
      </Stack>
    </EmptyStateBody>
  </EmptyState>
);

export default EmptyExternalModelsPage;
