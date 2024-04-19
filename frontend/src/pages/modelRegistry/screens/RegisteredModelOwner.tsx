import { Skeleton, Text } from '@patternfly/react-core';
import React from 'react';
import useModelVersionsByRegisteredModel from '~/concepts/modelRegistry/apiHooks/useModelVersionsByRegisteredModel';

type RegisteredModelOwnerProps = {
  registeredModelId: string;
};

const RegisteredModelOwner: React.FC<RegisteredModelOwnerProps> = ({ registeredModelId }) => {
  const [modelVersions, loaded] = useModelVersionsByRegisteredModel(registeredModelId);

  if (!loaded) {
    return <Skeleton />;
  }

  // TODO: Update the owner retrieval logic once RHOAIENG-5066 is resolved.
  // Currently, the author of the first model version is being used as the owner.
  const registeredModelOwner = modelVersions.items[0]?.author;

  return <Text data-testid="registered-model-owner">{registeredModelOwner || '-'}</Text>;
};

export default RegisteredModelOwner;
