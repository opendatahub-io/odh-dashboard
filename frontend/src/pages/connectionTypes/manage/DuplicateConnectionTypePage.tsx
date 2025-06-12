import * as React from 'react';
import { useLocation, useParams } from 'react-router';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { useConnectionType } from '#~/concepts/connectionTypes/useConnectionType';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import CreateConnectionTypePage from './CreateConnectionTypePage';

const DuplicateConnectionTypePage: React.FC = () => {
  const stateConnectionType = useLocation().state?.connectionType;

  const { name } = useParams();
  const [existingConnectionType, isLoaded, error] = useConnectionType(name);

  if (!isLoaded || error) {
    return (
      <ApplicationsPage
        loaded={isLoaded}
        loadError={error}
        empty
        errorMessage="Unable to load connection type"
      />
    );
  }

  const connectionType = stateConnectionType || existingConnectionType;

  const duplicate = connectionType
    ? {
        ...connectionType,
        metadata: {
          ...connectionType.metadata,
          name: '',
          annotations: {
            ...connectionType.metadata.annotations,
            'openshift.io/display-name':
              stateConnectionType &&
              existingConnectionType &&
              getDisplayNameFromK8sResource(stateConnectionType) !==
                getDisplayNameFromK8sResource(existingConnectionType)
                ? getDisplayNameFromK8sResource(stateConnectionType)
                : `Copy of ${getDisplayNameFromK8sResource(connectionType)}`,
            'opendatahub.io/username': '',
          },
        },
      }
    : undefined;

  return <CreateConnectionTypePage prefill={duplicate} />;
};

export default DuplicateConnectionTypePage;
