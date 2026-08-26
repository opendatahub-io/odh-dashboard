import * as React from 'react';
import { Bullseye, Button, Content, ContentVariants, Spinner } from '@patternfly/react-core';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { GenAiContext } from '~/app/context/GenAiContext';
import ModelsEmptyState from '~/app/EmptyStates/NoData';
import useFetchLlamaModels from '~/app/hooks/useFetchLlamaModels';
import useFetchLSDStatus from '~/app/hooks/useFetchLSDStatus';
import useMergedModels from '~/app/hooks/useMergedModels';
import AIModelsTable from '~/app/AIAssets/components/AIModelsTable';
import CreateExternalEndpointModal from '~/app/AIAssets/components/CreateExternalEndpointModal';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';
import { ExternalModelRequest, VerifyExternalModelRequest } from '~/app/types';
import useAiAssetCustomEndpointsEnabled from '~/app/hooks/useAiAssetCustomEndpointsEnabled';

const AIAssetsModelsTab: React.FC = () => {
  const { namespace } = React.useContext(GenAiContext);
  const { data: playgroundModels } = useFetchLlamaModels(undefined, true);

  const { models, loaded, error, refresh } = useMergedModels();
  const { data: lsdStatus } = useFetchLSDStatus();
  const { api, apiAvailable } = useGenAiAPI();
  const isExternalModelsEnabled = useAiAssetCustomEndpointsEnabled();

  // Modal state
  const [isCreateEndpointModalOpen, setIsCreateEndpointModalOpen] = React.useState(false);
  // Submit handler for creating external endpoint
  const handleCreateExternalEndpoint = React.useCallback(
    async (request: ExternalModelRequest) => {
      if (!apiAvailable) {
        throw new Error('API not available');
      }
      return api.createExternalModel(request);
    },
    [api, apiAvailable],
  );

  // Success handler to refresh models list
  const handleCreationSuccess = React.useCallback(() => {
    refresh();
  }, [refresh]);

  // Delete handler for external models
  const handleDeleteExternalModel = React.useCallback(
    async (modelId: string) => {
      if (!apiAvailable) {
        throw new Error('API not available');
      }
      try {
        /* eslint-disable-next-line camelcase */
        await api.deleteExternalModel({}, { model_id: modelId });
      } finally {
        // Always refresh the list, even if there was an error
        // This ensures UI stays in sync with backend state
        refresh();
      }
    },
    [api, apiAvailable, refresh],
  );

  // Verify handler for validating external endpoint
  const handleVerifyExternalEndpoint = React.useCallback(
    async (request: VerifyExternalModelRequest) => {
      if (!apiAvailable) {
        throw new Error('API not available');
      }
      return api.verifyExternalModel(request);
    },
    [api, apiAvailable],
  );

  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (error) {
    return (
      <ModelsEmptyState
        title="Unable to load models"
        description="There was a problem loading models. Try refreshing the page."
      />
    );
  }

  const emptyState = isExternalModelsEnabled ? (
    <ModelsEmptyState
      title="No endpoints available"
      description={
        <Content
          style={{
            textAlign: 'left',
          }}
        >
          <Content component="p">
            Looks like your project is missing at least one model to use the playground. Create an
            endpoint or follow the steps below to deploy a model and get started.
          </Content>
          <Content component={ContentVariants.ol}>
            <Content component={ContentVariants.li}>
              Go to your <b>Model Deployments</b> page
            </Content>
            <Content component={ContentVariants.li}>
              Select <b>&apos;Edit&apos;</b> to update your deployment
            </Content>
            <Content component={ContentVariants.li}>
              Check the box: <b>&apos;Make this deployment available as an AI asset&apos;</b>
            </Content>
          </Content>
        </Content>
      }
      actionButtonText="Deploy a model"
      actionButtonHref={`/ai-hub/deployments/${namespace?.name ?? ''}`}
      secondaryActionButtonText="Create endpoint"
      handleSecondaryActionButtonClick={() => {
        fireMiscTrackingEvent('Available Endpoints Create Endpoint Clicked', {
          source: 'empty_state',
        });
        setIsCreateEndpointModalOpen(true);
      }}
    />
  ) : (
    <ModelsEmptyState
      title="To begin you must deploy a model"
      description={
        <Content
          style={{
            textAlign: 'left',
          }}
        >
          <Content component="p">
            Looks like your project is missing at least one model to use the playground. Follow the
            steps below to deploy a model and get started.
          </Content>
          <Content component={ContentVariants.ol}>
            <Content component={ContentVariants.li}>
              Go to your <b>Model Deployments</b> page
            </Content>
            <Content component={ContentVariants.li}>
              Select <b>&apos;Edit&apos;</b> to update your deployment
            </Content>
            <Content component={ContentVariants.li}>
              Check the box: <b>&apos;Make this deployment available as an AI asset&apos;</b>
            </Content>
          </Content>
        </Content>
      }
      actionButtonText="Go to Deployments"
      actionButtonHref={`/ai-hub/deployments/${namespace?.name ?? ''}`}
    />
  );

  return (
    <>
      {models.length === 0 ? (
        emptyState
      ) : (
        <AIModelsTable
          models={models}
          playgroundModels={playgroundModels}
          lsdStatus={lsdStatus}
          toolbarActions={
            isExternalModelsEnabled ? (
              <Button
                variant="primary"
                onClick={() => {
                  fireMiscTrackingEvent('Available Endpoints Create Endpoint Clicked', {
                    source: 'toolbar',
                  });
                  setIsCreateEndpointModalOpen(true);
                }}
                data-testid="create-endpoint-button"
              >
                Create endpoint
              </Button>
            ) : undefined
          }
          onDelete={isExternalModelsEnabled ? handleDeleteExternalModel : undefined}
        />
      )}
      {isExternalModelsEnabled && (
        <CreateExternalEndpointModal
          isOpen={isCreateEndpointModalOpen}
          onClose={() => setIsCreateEndpointModalOpen(false)}
          onSuccess={handleCreationSuccess}
          onSubmit={handleCreateExternalEndpoint}
          onVerify={handleVerifyExternalEndpoint}
          existingModels={models}
        />
      )}
    </>
  );
};

export default AIAssetsModelsTab;
