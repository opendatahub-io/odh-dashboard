import * as React from 'react';
import { useParams } from 'react-router';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { useConnectionType } from '~/concepts/connectionTypes/useConnectionType';
import { CreateConnectionTypePage } from './CreateConnectionTypePage';

export const DuplicateConnectionTypePage: React.FC = () => {
  const { name } = useParams();
  const [existingConnectionType, isLoaded, error] = useConnectionType(name);

  if (existingConnectionType) {
    return <CreateConnectionTypePage prefill={existingConnectionType} />;
  }
  return <ApplicationsPage loaded={isLoaded} loadError={error} empty />;
};
