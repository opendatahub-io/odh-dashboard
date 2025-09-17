import * as React from 'react';
import { Bullseye, Content, ContentVariants, Spinner } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import ModelsEmptyState from '~/app/EmptyStates/NoData';
import { GenAiContext } from '~/app/context/GenAiContext';
import useFetchLlamaModels from '~/app/hooks/useFetchLlamaModels';
import { LlamaModel } from '~/app/types';
import AIModelsTable from './components/AIModelsTable';
import { AIModel } from './types';
import useFetchAIModels from './hooks/useFetchAIModels';

const AIAssetsModelsTab: React.FC = () => {
  const navigate = useNavigate();
  const { namespace } = React.useContext(GenAiContext);
  const { data: models, loaded, error } = useFetchAIModels(namespace?.name);
  const { data: playgroundModels, loaded: playgroundModelsLoaded } = useFetchLlamaModels(
    namespace?.name,
  );

  // Determine which AI Assets models are available in the playground
  const modelsWithPlaygroundStatus = React.useMemo(() => {
    const playgroundModelIds = new Set(playgroundModels.map((model: LlamaModel) => model.id));

    return models.map((model: AIModel) => ({
      ...model,
      playgroundStatus: playgroundModelIds.has(model.model_name) ? 'available' : 'not-available',
    }));
  }, [models, playgroundModels]);

  const handleTryInPlayground = (model: AIModel) => {
    // Navigate to playground with the selected model
    const playgroundUrl = `/gen-ai/playground/${namespace?.name}?model=${encodeURIComponent(model.model_name)}`;
    navigate(playgroundUrl);
  };

  if (!loaded || !playgroundModelsLoaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (error || modelsWithPlaygroundStatus.length === 0) {
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
        actionButtonText="Go to Model Deployments"
        handleActionButtonClick={() => {
          navigate(`/modelServing/${namespace?.name}`);
        }}
      />
    );
  }

  return (
    <AIModelsTable models={modelsWithPlaygroundStatus} onTryInPlayground={handleTryInPlayground} />
  );
};

export default AIAssetsModelsTab;
