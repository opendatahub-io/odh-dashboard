import * as React from 'react';
import { Bullseye, Content, Spinner } from '@patternfly/react-core';
import ModelsEmptyState from '~/app/EmptyStates/NoData';
import useFetchMaaSModels from '~/app/hooks/useFetchMaaSModels';
import MaaSModelsTable from '~/app/AIAssets/components/MaaSModelsTable';

const AIAssetsMaaSTab: React.FC = () => {
  const { data: models = [], loaded, error } = useFetchMaaSModels();

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
        title="No MaaS models available"
        description={
          <Content
            style={{
              textAlign: 'left',
            }}
          >
            <Content component="p">
              No Model as a Service (MaaS) models are currently available.
            </Content>
          </Content>
        }
      />
    );
  }

  return <MaaSModelsTable models={models} />;
};

export default AIAssetsMaaSTab;
