import { Truncate } from '@patternfly/react-core';
import * as React from 'react';
import { Link } from 'react-router-dom';
import { ModelRegistrySelectorContext } from '~/concepts/modelRegistry/context/ModelRegistrySelectorContext';
import { RegisteredModel } from '~/concepts/modelRegistry/types';

type RegisteredModelLinkProps = {
  registeredModel: RegisteredModel;
};

const RegisteredModelLink: React.FC<RegisteredModelLinkProps> = ({ registeredModel }) => {
  const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);
  const registeredModelId = registeredModel.id;

  return (
    <Link
      to={`/modelRegistry/${preferredModelRegistry?.metadata.name}/registeredModels/${registeredModelId}`}
    >
      <Truncate content={registeredModel.name} />
    </Link>
  );
};

export default RegisteredModelLink;
