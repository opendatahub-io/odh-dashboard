import { Truncate } from '@patternfly/react-core';
import * as React from 'react';
import { Link } from 'react-router-dom';
import { ModelRegistryContext } from '~/concepts/modelRegistry/context/ModelRegistryContext';
import { RegisteredModel } from '~/concepts/modelRegistry/types';

type RegisteredModelLinkProps = {
  registeredModel: RegisteredModel;
};

const RegisteredModelLink: React.FC<RegisteredModelLinkProps> = ({ registeredModel }) => {
  const { preferredModelRegistry } = React.useContext(ModelRegistryContext);
  const registeredModelId = registeredModel.id;

  return (
    <Link
      to={`/modelRegistry/${preferredModelRegistry?.metadata.name}/registered_models/${registeredModelId}`}
    >
      <Truncate content={registeredModel.name} />
    </Link>
  );
};

export default RegisteredModelLink;
