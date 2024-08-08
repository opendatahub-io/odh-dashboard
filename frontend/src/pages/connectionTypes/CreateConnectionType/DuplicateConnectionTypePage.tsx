import * as React from 'react';
import { useParams } from 'react-router';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { useConnectionType } from '~/concepts/connectionTypes/useConnectionType';
import { CreateConnectionTypePage } from './CreateConnectionTypePage';
import { extractConnectionTypeFromMap } from './CreateConnectionTypeUtils';

export const DuplicateConnectionTypePage: React.FC = () => {
  const { name } = useParams();

  const [loaded, error, existingConnectionType] = useConnectionType(name);
  const [nameDesc, enabled, fields] = React.useMemo(
    () => extractConnectionTypeFromMap(existingConnectionType),
    [existingConnectionType],
  );

  if (existingConnectionType) {
    return (
      <CreateConnectionTypePage
        prefillNameDesc={{
          k8sName: undefined,
          name: `Duplicate of ${nameDesc.name}`,
          description: nameDesc.description,
        }}
        prefillEnabled={enabled}
        prefillFields={fields}
      />
    );
  }
  return <ApplicationsPage loaded={loaded} loadError={error} empty />;
};