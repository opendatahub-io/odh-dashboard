import React from 'react';
import { PvcSelect } from '@odh-dashboard/internal/pages/modelServing/screens/projects/InferenceServiceModal/PVCSelect';
import type { LabeledConnection } from '@odh-dashboard/internal/pages/modelServing/screens/types';
import {
  Connection,
  ConnectionTypeConfigMapObj,
} from '@odh-dashboard/internal/concepts/connectionTypes/types';
import {
  isModelServingCompatible,
  ModelServingCompatibleTypes,
} from '@odh-dashboard/internal/concepts/connectionTypes/utils';
import { z } from 'zod';
import { ConnectionOciAlert } from '@odh-dashboard/internal/pages/modelServing/screens/projects/InferenceServiceModal/ConnectionOciAlert';
import { ExistingConnectionField } from './modelLocationFields/ExistingConnectionField';
import { ModelLocationFieldData } from './ModelLocationSelectField';
import {
  ConnectionTypeRefs,
  ModelLocationData,
  ModelLocationType,
} from './modelLocationFields/types';
import NewConnectionField from './modelLocationFields/NewConnectionField';
import { isExistingModelLocation } from '../utils';

export type ModelLocationDataField = {
  data: ModelLocationData | undefined;
  setData: (data: ModelLocationData | undefined) => void;
};

export const useModelLocationData = (existingData?: ModelLocationData): ModelLocationDataField => {
  const [modelLocationData, setModelLocationData] = React.useState<ModelLocationData | undefined>(
    existingData,
  );
  return {
    data: modelLocationData,
    setData: setModelLocationData,
  };
};

export const isValidModelLocationData = (
  modelLocation: ModelLocationFieldData,
  modelLocationData?: ModelLocationData,
): boolean => {
  if (!modelLocationData) return false;

  switch (modelLocation) {
    case ModelLocationType.EXISTING:
      return (
        isExistingModelLocation(modelLocationData) &&
        !!modelLocationData.connection &&
        (!!modelLocationData.modelUri || !!modelLocationData.modelPath)
      );

    case ModelLocationType.URI:
      return modelLocationData.type === ModelLocationType.URI && !!modelLocationData.uri;

    case ModelLocationType.OCI:
      return (
        modelLocationData.type === ModelLocationType.OCI &&
        !!modelLocationData.secretDetails &&
        !!modelLocationData.registryHost &&
        !!modelLocationData.uri
      );

    case ModelLocationType.S3:
      return (
        modelLocationData.type === ModelLocationType.S3 &&
        !!modelLocationData.accessKey &&
        !!modelLocationData.secretKey &&
        !!modelLocationData.endpoint &&
        !!modelLocationData.path
      );

    case ModelLocationType.PVC:
      return modelLocationData.type === ModelLocationType.PVC && !!modelLocationData.storageUri;

    default:
      return false;
  }
};

export const modelLocationDataSchema = z.object({
  modelLocationData: z.custom<ModelLocationData>((val) => {
    return isValidModelLocationData(val.modelLocation, val.modelLocationData);
  }),
});

type ModelLocationInputFieldsProps = {
  modelLocation: ModelLocationFieldData;
  connections: LabeledConnection[];
  connectionTypes: ConnectionTypeConfigMapObj[];
  selectedConnection: Connection | undefined;
  setSelectedConnection: (connection: Connection) => void;
  selectedConnectionType: ConnectionTypeConfigMapObj | undefined;
  setModelLocationData: (data: ModelLocationData | undefined) => void;
  resetModelLocationData: () => void;
  modelLocationData?: ModelLocationData;
};

export const ModelLocationInputFields: React.FC<ModelLocationInputFieldsProps> = ({
  modelLocation,
  connections,
  connectionTypes,
  selectedConnection,
  setSelectedConnection,
  selectedConnectionType,
  setModelLocationData,
  resetModelLocationData,
  modelLocationData,
}) => {
  if (modelLocation === ModelLocationType.EXISTING) {
    return (
      <ExistingConnectionField
        connectionTypes={connectionTypes}
        projectConnections={connections}
        onSelect={(connection) => {
          setSelectedConnection(connection);
        }}
        selectedConnection={selectedConnection}
        selectedConnectionType={selectedConnectionType}
        setModelLocationData={setModelLocationData}
        resetModelLocationData={resetModelLocationData}
        modelLocationData={modelLocationData}
      >
        {selectedConnectionType &&
          isModelServingCompatible(selectedConnectionType, ModelServingCompatibleTypes.OCI) && (
            <ConnectionOciAlert />
          )}
      </ExistingConnectionField>
    );
  }
  if (modelLocation === ModelLocationType.URI) {
    const uriConnectionType = connectionTypes.find(
      (ct) => ct.metadata.name === ConnectionTypeRefs.URI,
    );
    if (uriConnectionType) {
      return (
        <NewConnectionField
          modelLocationType={ModelLocationType.URI}
          connectionType={uriConnectionType}
          setModelLocationData={setModelLocationData}
          modelLocationData={modelLocationData}
        />
      );
    }
  }
  if (modelLocation === ModelLocationType.OCI) {
    const ociConnectionType = connectionTypes.find(
      (ct) => ct.metadata.name === ConnectionTypeRefs.OCI,
    );
    if (ociConnectionType) {
      return (
        <NewConnectionField
          modelLocationType={ModelLocationType.OCI}
          connectionType={ociConnectionType}
          setModelLocationData={setModelLocationData}
          modelLocationData={modelLocationData}
        />
      );
    }
  }
  if (modelLocation === ModelLocationType.PVC) {
    return (
      <div>
        <PvcSelect
          pvcs={[]}
          selectedPVC={undefined}
          onSelect={() => {
            // TODO: Implement
          }}
          setModelUri={() => {
            // TODO: Implement
          }}
          setIsConnectionValid={() => {
            // TODO: Implement
          }}
        />
      </div>
    );
  }
  if (modelLocation === ModelLocationType.S3) {
    const s3ConnectionType = connectionTypes.find(
      (ct) => ct.metadata.name === ConnectionTypeRefs.S3,
    );
    if (s3ConnectionType) {
      return (
        <NewConnectionField
          modelLocationType={ModelLocationType.S3}
          connectionType={s3ConnectionType}
          setModelLocationData={setModelLocationData}
          modelLocationData={modelLocationData}
        />
      );
    }
  }
  return <div>Connection type not found</div>;
};
