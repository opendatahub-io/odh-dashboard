import { Truncate } from '@patternfly/react-core';
import * as React from 'react';
import { Link } from 'react-router-dom';
import { RegisteredModel } from '~/concepts/modelRegistry/types';
import useRegisteredModelUrl from './useRegisteredModelUrl';

type RegisteredModelLinkProps = {
  registeredModel: RegisteredModel;
};

const RegisteredModelLink: React.FC<RegisteredModelLinkProps> = ({ registeredModel }) => (
  <Link to={useRegisteredModelUrl(registeredModel)}>
    <Truncate content={registeredModel.name} />
  </Link>
);

export default RegisteredModelLink;
