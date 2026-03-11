import * as React from 'react';
import { Bullseye, Content, ContentVariants, Spinner, Button, Alert } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { GenAiContext } from '~/app/context/GenAiContext';
import ModelsEmptyState from '~/app/EmptyStates/NoData';
import useFetchLlamaModels from '~/app/hooks/useFetchLlamaModels';
import useFetchLSDStatus from '~/app/hooks/useFetchLSDStatus';
import useMergedModels from '~/app/hooks/useMergedModels';
import AIModelsTable from '~/app/AIAssets/components/AIModelsTable';
import CreateExternalEndpointModal from '~/app/AIAssets/components/CreateExternalEndpointModal';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';
import { ExternalModelRequest } from '~/app/types';
import useAiAssetExternalModelsEnabled from '~/app/hooks/useAiAssetExternalModelsEnabled';

const AIAssetsModelsTab: React.FC = () => {
  const navigate = useNavigate();
  const { namespace } = React.useContext(GenAiContext);
  const { data: playgroundModels } = useFetchLlamaModels();

  const { models, loaded, aiError, maasError, refresh } = useMergedModels();
  const { data: lsdStatus } = useFetchLSDStatus();
  const { api, apiAvailable } = useGenAiAPI();
  const isExternalModelsEnabled = useAiAssetExternalModelsEnabled();

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

  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (aiError && maasError) {
    return (
      <ModelsEmptyState
        title="Unable to load models"
        description="There was a problem loading models. Try refreshing the page."
      />
    );
  }

  const warnings: string[] = [];
  if (aiError) {
    warnings.push('Locally deployed models could not be loaded.');
  }
  if (maasError) {
    warnings.push('Models as a Service could not be loaded.');
  }

  const emptyState = (
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
      handleActionButtonClick={() => {
        navigate(`/ai-hub/deployments/${namespace?.name}`);
      }}
    />
  );

  return (
    <>
      {warnings.length > 0 && (
        <Alert
          variant="warning"
          isInline
          title="Some models may be unavailable"
          style={{ marginBottom: 'var(--pf-t--global--spacer--md)' }}
        >
          {warnings.join(' ')} Only models from available sources are shown.
        </Alert>
      )}
      {models.length === 0 ? (
        warnings.length > 0 ? (
          <ModelsEmptyState
            title="Some model sources could not be loaded"
            description="Refresh the page or try again later."
          />
        ) : (
          emptyState
        )
      ) : (
        <>
          <AIModelsTable
            models={models}
            playgroundModels={playgroundModels}
            lsdStatus={lsdStatus}
            toolbarActions={
              isExternalModelsEnabled ? (
                <Button
                  variant="primary"
                  onClick={() => setIsCreateEndpointModalOpen(true)}
                  data-testid="register-external-endpoint-button"
                >
                  Register external endpoint
                </Button>
              ) : undefined
            }
          />
          {isExternalModelsEnabled && (
            <CreateExternalEndpointModal
              isOpen={isCreateEndpointModalOpen}
              onClose={() => setIsCreateEndpointModalOpen(false)}
              onSuccess={handleCreationSuccess}
              onSubmit={handleCreateExternalEndpoint}
            />
          )}
        </>
      )}
    </>
  );
};

export default AIAssetsModelsTab;
