import * as React from 'react';
import { Bullseye, Content, ContentVariants, Spinner } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import ModelsEmptyState from '~/app/EmptyStates/NoData';
import { GenAiContext } from '~/app/context/GenAiContext';
import AIModelsTable from './components/AIModelsTable';
import { AIModel } from './types';
import useFetchAIModels from './hooks/useFetchAIModels';

const AIAssetsModelsTab: React.FC = () => {
  const navigate = useNavigate();
  const { namespace } = React.useContext(GenAiContext);
  const { data: models, loaded, error } = useFetchAIModels(namespace?.name);

  const handleViewInternalEndpoint = (model: AIModel) => {
    // TODO: Implement navigation to internal endpoint details
    // eslint-disable-next-line no-console
    console.log('View internal endpoint for:', model.name);
  };

  const handleCreateExternalEndpoint = (model: AIModel) => {
    // TODO: Implement external endpoint creation
    // eslint-disable-next-line no-console
    console.log('Create external endpoint for:', model.name);
  };

  const handleViewExternalEndpoint = (model: AIModel) => {
    // TODO: Implement navigation to external endpoint details
    // eslint-disable-next-line no-console
    console.log('View external endpoint for:', model.name);
  };

  const handleAddToPlayground = (model: AIModel) => {
    // TODO: Implement add to playground functionality
    // eslint-disable-next-line no-console
    console.log('Add to playground:', model.name);
  };

  const handleTryInPlayground = (model: AIModel) => {
    // TODO: Implement try in playground functionality
    // eslint-disable-next-line no-console
    console.log('Try in playground:', model.name);
  };

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
        title="Error loading models"
        description={`Failed to load models: ${error.message}`}
        actionButtonText="Retry"
        handleActionButtonClick={() => window.location.reload()}
      />
    );
  }

  if (models.length === 0) {
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
          navigate('/modelServing');
        }}
      />
    );
  }

  return (
    <AIModelsTable
      models={models}
      onViewInternalEndpoint={handleViewInternalEndpoint}
      onCreateExternalEndpoint={handleCreateExternalEndpoint}
      onViewExternalEndpoint={handleViewExternalEndpoint}
      onAddToPlayground={handleAddToPlayground}
      onTryInPlayground={handleTryInPlayground}
    />
  );
};

export default AIAssetsModelsTab;
