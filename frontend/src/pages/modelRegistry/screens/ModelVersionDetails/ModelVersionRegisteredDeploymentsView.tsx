import * as React from 'react';
import { ModelVersion } from '~/concepts/modelRegistry/types';
import EmptyModelRegistryState from '~/pages/modelRegistry/screens/EmptyModelRegistryState';

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
      title="No registered deployments"
      description="You can deploy this version using Actions dropdown in the header"
    />
  );
};
export default ModelVersionRegisteredDeploymentsView;
