import * as React from 'react';
import { useParams } from 'react-router';
import { useNavigate } from 'react-router-dom';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { useConnectionType } from '#~/concepts/connectionTypes/useConnectionType';
import { updateConnectionType } from '#~/services/connectionTypesService';
import { isOOTB } from '#~/concepts/k8s/utils';
import ManageConnectionTypePage from './ManageConnectionTypePage';

const EditConnectionTypePage: React.FC = () => {
  const navigate = useNavigate();
  const { name } = useParams();
  const [existingConnectionType, isLoaded, error] = useConnectionType(name);

  if (existingConnectionType && isOOTB(existingConnectionType)) {
    navigate('/connectionTypes');
    return null;
  }

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

  return (
    <ManageConnectionTypePage
      isEdit
      prefill={existingConnectionType}
      onSave={async (obj) => {
        const response = await updateConnectionType(obj);
        if (response.error) {
          throw new Error(response.error);
        }
      }}
    />
  );
};

export default EditConnectionTypePage;
