import * as React from 'react';
import { useParams } from 'react-router';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { useConnectionType } from '~/concepts/connectionTypes/useConnectionType';
import { CreateConnectionTypePage } from './CreateConnectionTypePage';

export const DuplicateConnectionTypePage: React.FC = () => {
  const { name } = useParams();
  const [existingConnectionType, isLoaded, error] = useConnectionType(name);

  if (existingConnectionType) {
    const duplicate = {
      ...existingConnectionType,
      metadata: {
        ...existingConnectionType.metadata,
        name: '',
        annotations: {
          ...existingConnectionType.metadata.annotations,
          'openshift.io/display-name': `Duplicate of ${existingConnectionType.metadata.annotations['openshift.io/display-name']}`,
          'opendatahub.io/username': '',
        },
      },
    };

    return <CreateConnectionTypePage prefill={duplicate} />;
  }
  return <ApplicationsPage loaded={isLoaded} loadError={error} empty />;
};
