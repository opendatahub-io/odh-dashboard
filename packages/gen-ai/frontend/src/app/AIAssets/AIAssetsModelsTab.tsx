import * as React from 'react';
import { Bullseye, Content, ContentVariants, Spinner } from '@patternfly/react-core';
import { Namespace } from 'mod-arch-core';
import { useNavigate } from 'react-router-dom';
import ModelsEmptyState from '~/app/EmptyStates/NoData';
import { LlamaModel, AIModel } from '~/app/types';
import useFetchLSDStatus from '~/app/hooks/useFetchLSDStatus';
import AIModelsTable from './components/AIModelsTable';

type AIAssetsModelsTabProps = {
  models: AIModel[];
  playgroundModels: LlamaModel[];
  namespace?: Namespace;
  loaded: boolean;
  error?: Error;
};

const AIAssetsModelsTab: React.FC<AIAssetsModelsTabProps> = ({
  models,
  playgroundModels,
  namespace,
  loaded,
  error,
}) => {
  const navigate = useNavigate();
  const { data: lsdStatus } = useFetchLSDStatus(namespace?.name);

  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (error || models.length === 0) {
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
    <AIModelsTable models={models} playgroundModels={playgroundModels} lsdStatus={lsdStatus} />
  );
};

export default AIAssetsModelsTab;
