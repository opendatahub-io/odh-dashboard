import React from 'react';
import { FormSection } from '@patternfly/react-core';
import { ConnectionTypeConfigMapObj } from '~/concepts/connectionTypes/types';
import {
  NewConnectionField,
  useNewConnectionField,
  UseNewConnectionFieldData,
} from '~/concepts/connectionTypes/NewConnectionField';
import {
  isModelServingCompatible,
  ModelServingCompatibleTypes,
} from '~/concepts/connectionTypes/utils';
import ConnectionS3FolderPathField from '~/pages/modelServing/modelConnectionSection/ConnectionS3FolderPathField';
import ConnectionOciPathField from '~/pages/modelServing/modelConnectionSection/ConnectionOciPathField';
import { ModelConnection } from './types';

type NewModelConnectionFieldProps = {
  projectName: string;
  connectionTypes: ConnectionTypeConfigMapObj[];
  selectedConnectionType?: ConnectionTypeConfigMapObj;
  modelConnection?: ModelConnection;
  setModelConnection: (model: ModelConnection) => void;
  setIsModelConnectionValid: (isValid: boolean) => void;
  extraValidation?: UseNewConnectionFieldData['extraValidation'];
};

export const NewModelConnectionField: React.FC<NewModelConnectionFieldProps> = ({
  projectName,
  connectionTypes,
  selectedConnectionType,
  modelConnection,
  setModelConnection,
  setIsModelConnectionValid,
  extraValidation,
}) => {
  const newConnectionData = useNewConnectionField(
    projectName,
    connectionTypes,
    selectedConnectionType,
    extraValidation,
  );

  return (
    <FormSection>
      <NewConnectionField
        newConnectionData={newConnectionData}
        setIsConnectionValid={setIsModelConnectionValid}
        setNewConnection={(c) => setModelConnection({ ...modelConnection, connection: c })}
      />
      {newConnectionData.selectedConnectionType &&
        isModelServingCompatible(
          newConnectionData.selectedConnectionType,
          ModelServingCompatibleTypes.S3ObjectStorage,
        ) && (
          <ConnectionS3FolderPathField
            folderPath={modelConnection?.path}
            setFolderPath={(path) => setModelConnection({ ...modelConnection, path })}
          />
        )}
      {newConnectionData.selectedConnectionType &&
        isModelServingCompatible(
          newConnectionData.selectedConnectionType,
          ModelServingCompatibleTypes.OCI,
        ) &&
        (typeof newConnectionData.connectionValues.OCI_HOST === 'string' ||
          typeof newConnectionData.connectionValues.OCI_HOST === 'undefined') && (
          <ConnectionOciPathField
            ociHost={newConnectionData.connectionValues.OCI_HOST}
            modelUri={modelConnection?.uri}
            setModelUri={(uri) => setModelConnection({ ...modelConnection, uri })}
            isNewConnection
          />
        )}
    </FormSection>
  );
};
