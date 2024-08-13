import React from 'react';
import { Alert } from '@patternfly/react-core';
import PasswordHiddenText from '~/components/PasswordHiddenText';

type ModelRegistryDatabasePasswordProps = {
  password?: string;
  loadError?: Error;
};

const ModelRegistryDatabasePassword: React.FC<ModelRegistryDatabasePasswordProps> = ({
  password,
  loadError,
}) => {
  if (loadError) {
    return <Alert variant="danger" isInline isPlain title="Error loading password" />;
  }
  if (!password) {
    return 'No password';
  }
  return <PasswordHiddenText password={password} />;
};

export default ModelRegistryDatabasePassword;
