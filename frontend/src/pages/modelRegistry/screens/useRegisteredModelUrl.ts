import * as React from 'react';
import { ModelRegistrySelectorContext } from '~/concepts/modelRegistry/context/ModelRegistrySelectorContext';
import { RegisteredModel } from '~/concepts/modelRegistry/types';

const useRegisteredModelUrl = (rm: RegisteredModel): string => {
  const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);
  const registeredModelId = rm.id;
  return `/modelRegistry/${preferredModelRegistry?.metadata.name}/registeredModels/${registeredModelId}`;
};

export default useRegisteredModelUrl;
