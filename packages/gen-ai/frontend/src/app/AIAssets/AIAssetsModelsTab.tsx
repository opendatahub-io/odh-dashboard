import * as React from 'react';
import { Bullseye, Content, ContentVariants, Spinner } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import ModelsEmptyState from '~/app/EmptyStates/NoData';
import useFetchLlamaModels from '~/app/hooks/useFetchLlamaModels';
import { GenAiContext } from '~/app/context/GenAiContext';

const AIAssetsModelsTab: React.FC = () => {
  const navigate = useNavigate();
  const { namespace } = React.useContext(GenAiContext);
  const { data: models, loaded } = useFetchLlamaModels(namespace?.name);

  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
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
    <>
      {/* TODO: Add list of models */}
      List goes here
    </>
  );
};

export default AIAssetsModelsTab;
