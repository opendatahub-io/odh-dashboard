import React from 'react';
import { ConnectionTypeConfigMapObj } from '~/concepts/connectionTypes/types';
import { ExistingConnectionField } from '~/concepts/connectionTypes/ExistingConnectionField';
import {
  isModelServingCompatible,
  ModelServingCompatibleTypes,
} from '~/concepts/connectionTypes/utils';
import { LabeledConnection } from '~/pages/modelServing/screens/types';
import ConnectionS3FolderPathField from './ConnectionS3FolderPathField';
import { ConnectionOciAlert } from './ConnectionOciAlert';
import ConnectionOciPathField from './ConnectionOciPathField';
import { ModelConnection } from './types';

type ExistingModelConnectionFieldProps = {
  connectionTypes: ConnectionTypeConfigMapObj[];
  projectConnections: LabeledConnection[];
  modelConnection?: ModelConnection;
  setModelConnection: (model: ModelConnection) => void;
  setIsModelConnectionValid: (isValid: boolean) => void;
};

export const ExistingModelConnectionField: React.FC<ExistingModelConnectionFieldProps> = ({
  connectionTypes,
  projectConnections,
  modelConnection,
  setModelConnection,
  setIsModelConnectionValid,
}) => {
  // React.useEffect(() => {
  //   setIsConnectionValid(
  //     !!selectedConnection && isModelPathValid(selectedConnection, folderPath, modelUri),
  //   );
  // }, [folderPath, modelUri, selectedConnection, setIsConnectionValid]);
  const a = 0;

  return (
    <>
      <ExistingConnectionField
        connectionTypes={connectionTypes}
        projectConnections={projectConnections}
        selectedConnection={modelConnection?.connection}
        onSelect={(c) => setModelConnection({ ...modelConnection, connection: c })}
        setIsConnectionValid={setIsModelConnectionValid}
      />
      {modelConnection?.connection &&
        isModelServingCompatible(
          modelConnection.connection,
          ModelServingCompatibleTypes.S3ObjectStorage,
        ) && (
          <ConnectionS3FolderPathField
            folderPath={modelConnection.path}
            setFolderPath={(path) => setModelConnection({ ...modelConnection, path })}
          />
        )}
      {modelConnection?.connection &&
        isModelServingCompatible(modelConnection.connection, ModelServingCompatibleTypes.OCI) && (
          <>
            <ConnectionOciAlert />
            <ConnectionOciPathField
              ociHost={window.atob(modelConnection.connection.data?.OCI_HOST ?? '')}
              modelUri={modelConnection.uri}
              setModelUri={(uri) => setModelConnection({ ...modelConnection, uri })}
            />
          </>
        )}
    </>
  );
};
