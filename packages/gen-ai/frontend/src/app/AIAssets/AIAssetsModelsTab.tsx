import * as React from 'react';
import { Bullseye, Content, ContentVariants, Spinner, Button } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { GenAiContext } from '~/app/context/GenAiContext';
import ModelsEmptyState from '~/app/EmptyStates/NoData';
import useFetchAIModels from '~/app/hooks/useFetchAIModels';
import useFetchLlamaModels from '~/app/hooks/useFetchLlamaModels';
import useFetchLSDStatus from '~/app/hooks/useFetchLSDStatus';
import AIModelsTable from '~/app/AIAssets/components/AIModelsTable';
import useFetchMaaSModels from '~/app/hooks/useFetchMaaSModels';
import CreateExternalEndpointModal from '~/app/AIAssets/components/CreateExternalEndpointModal';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';
import { ExternalModelRequest } from '~/app/types';
import useAiAssetExternalModelsEnabled from '~/app/hooks/useAiAssetExternalModelsEnabled';

const AIAssetsModelsTab: React.FC = () => {
  const navigate = useNavigate();
  const { namespace } = React.useContext(GenAiContext);
  const { data: playgroundModels } = useFetchLlamaModels();
  const { data: aiModels = [], loaded, error, refresh } = useFetchAIModels();
  const { data: maasModels = [] } = useFetchMaaSModels();
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

  if (!loaded && !error) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (error || aiModels.length === 0) {
    return (
      <ModelsEmptyState
        title="To begin you must deploy a model"
        description={
          <Content
            style={{
              textAlign: 'left',
            }}
          >
            <Content component="p">
              Looks like your project is missing at least one model to use the playground. Follow
              the steps below to deploy a model and get started.
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
  }

  return (
    <>
      <AIModelsTable
        aiModels={aiModels}
        maasModels={maasModels}
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
  );
};

export default AIAssetsModelsTab;
