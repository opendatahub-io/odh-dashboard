import * as React from 'react';
import { useParams } from 'react-router';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { useConnectionType } from '~/concepts/connectionTypes/useConnectionType';
import { updateConnectionType } from '~/services/connectionTypesService';
import ManageConnectionTypePage from './ManageConnectionTypePage';

const EditConnectionTypePage: React.FC = () => {
  const { name } = useParams();
  const [existingConnectionType, isLoaded, error] = useConnectionType(name);

  if (!isLoaded || error) {
    return <ApplicationsPage loaded={isLoaded} loadError={error} empty />;
  }

  return (
    <ManageConnectionTypePage
      isEdit
      prefill={existingConnectionType}
      onSave={async (obj) => {
        const response = await updateConnectionType(obj);
        if (response.error) {
          throw response.error;
        }
      }}
    />
  );
};

export default EditConnectionTypePage;
