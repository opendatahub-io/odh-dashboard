import * as React from 'react';
import { ModelVersion } from '~/concepts/modelRegistry/types';
import EmptyModelRegistryState from '~/pages/modelRegistry/screens/components/EmptyModelRegistryState';

type ModelVersionRegisteredDeploymentsViewProps = {
  modelVersion: ModelVersion;
};

const ModelVersionRegisteredDeploymentsView: React.FC<
  ModelVersionRegisteredDeploymentsViewProps
> = ({ modelVersion: mv }) => {
  // eslint-disable-next-line no-console
  console.log({ mv });
  //TODO: implement component
  return (
    <EmptyModelRegistryState
      title="No deployments"
      description="No deployments initiated from this model version."
    />
  );
};
export default ModelVersionRegisteredDeploymentsView;
