import { Skeleton, Text } from '@patternfly/react-core';
import React from 'react';
import useModelVersionsByRegisteredModel from '~/concepts/modelRegistry/apiHooks/useModelVersionsByRegisteredModel';

type RegisteredModelAuthorProps = {
  registeredModelId: string;
};

const RegisteredModelAuthor: React.FC<RegisteredModelAuthorProps> = ({ registeredModelId }) => {
  const [modelVersions, loaded] = useModelVersionsByRegisteredModel(registeredModelId);

  if (!loaded) {
    return <Skeleton />;
  }

  // TODO: Update the author retrieval logic once RHOAIENG-5066 is resolved.
  // Currently, the author of the first model version is being used as the author.
  const registeredModelAuthor = modelVersions.items[0]?.author;

  return <Text data-testid="registered-model-author">{registeredModelAuthor || '-'}</Text>;
};

export default RegisteredModelAuthor;
