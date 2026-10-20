import * as React from 'react';
import {
  Alert,
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  PageSection,
  Spinner,
} from '@patternfly/react-core';
import { ApplicationsPage } from 'mod-arch-shared';
import AIModelsTable from '~/app/AIAssets/components/AIModelsTable';
import { LlamaModel } from '~/app/types';
import useFetchAIModels from '~/app/hooks/useFetchAIModels';

const NO_PLAYGROUND_MODELS: LlamaModel[] = [];

const MaaSModelsPage: React.FC = () => {
  const { data: models, loaded, error, refresh } = useFetchAIModels();

  return (
    <ApplicationsPage
      title="Models Endpoints"
      description="Browse the Models-as-a-Service endpoints available through your subscriptions."
      loaded
      empty={false}
    >
      <PageSection data-testid="maas-models-page">
        {error ? (
          <Alert
            isInline
            variant="danger"
            title="Unable to load MaaS models"
            data-testid="maas-models-error"
          >
            <p>There was a problem loading your subscription models. Try again.</p>
            <Button variant="link" onClick={refresh} data-testid="maas-models-retry">
              Retry
            </Button>
          </Alert>
        ) : !loaded ? (
          <Bullseye>
            <Spinner aria-label="Loading MaaS models" data-testid="maas-models-loading" />
          </Bullseye>
        ) : models.length === 0 ? (
          <EmptyState
            titleText="No MaaS models available"
            headingLevel="h2"
            data-testid="maas-models-empty"
          >
            <EmptyStateBody>
              No models are available through your subscriptions. Contact your administrator for
              access to MaaS models.
            </EmptyStateBody>
          </EmptyState>
        ) : (
          <AIModelsTable
            models={models}
            playgroundModels={NO_PLAYGROUND_MODELS}
            lsdStatus={null}
            showPlaygroundColumn={false}
            showModelStatusPopover={false}
          />
        )}
      </PageSection>
    </ApplicationsPage>
  );
};

export default MaaSModelsPage;
