import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bullseye, Content, Spinner } from '@patternfly/react-core';
import ModelsEmptyState from '~/app/EmptyStates/NoData';
import useFetchMaaSModels from '~/app/hooks/useFetchMaaSModels';
import MaaSModelsTable from '~/app/AIAssets/components/MaaSModelsTable';
import { GenAiContext } from '~/app/context/GenAiContext';

const AIAssetsMaaSTab: React.FC = () => {
  const navigate = useNavigate();
  const { namespace } = React.useContext(GenAiContext);
  const { data: models = [], loaded, error } = useFetchMaaSModels(namespace?.name || '');

  if (!loaded && !error) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (error || models.length === 0) {
    return (
      <ModelsEmptyState
        title="No models available as a service"
        description={
          <Content
            style={{
              textAlign: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            <Content component="p">
              This page displays only model deployments that are available through model as a
              service. <br /> To make a deployment available as model as a service, edit it from the{' '}
              <b>Model deployments</b> page.
            </Content>
          </Content>
        }
        actionButtonText="Go to model deployments"
        handleActionButtonClick={() => {
          navigate(`/ai-hub/deployments/${namespace?.name}`);
        }}
      />
    );
  }

  return <MaaSModelsTable models={models} namespace={namespace?.name || ''} />;
};

export default AIAssetsMaaSTab;
