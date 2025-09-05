import React from 'react';
import { PvcSelect } from '@odh-dashboard/internal/pages/modelServing/screens/projects/InferenceServiceModal/PVCSelect';
import type { LabeledConnection } from '@odh-dashboard/internal/pages/modelServing/screens/types';
import {
  Connection,
  ConnectionTypeConfigMapObj,
  ConnectionTypeDataField,
} from '@odh-dashboard/internal/concepts/connectionTypes/types';
import {
  isModelServingCompatible,
  ModelServingCompatibleTypes,
  getConnectionTypeRef,
} from '@odh-dashboard/internal/concepts/connectionTypes/utils';
import { z } from 'zod';
import { ConnectionOciAlert } from '@odh-dashboard/internal/pages/modelServing/screens/projects/InferenceServiceModal/ConnectionOciAlert';
import { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import useServingConnections from '@odh-dashboard/internal/pages/projects/screens/detail/connections/useServingConnections';
import useLabeledConnections from '@odh-dashboard/internal/pages/modelServing/screens/projects/useLabeledConnections';
import { getResourceNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import { ExistingConnectionField } from './modelLocationFields/ExistingConnectionField';
import { ModelLocationData, ModelLocationType } from './modelLocationFields/types';
import NewConnectionField from './modelLocationFields/NewConnectionField';
import { isExistingModelLocation } from '../utils';

export type ModelLocationDataField = {
  data: ModelLocationData | undefined;
  setData: (data: ModelLocationData | undefined) => void;
  connections: LabeledConnection[];
  setSelectedConnection: (
    connection: LabeledConnection | undefined,
    connectionTypes: ConnectionTypeConfigMapObj[],
  ) => void;
  selectedConnection: LabeledConnection | undefined;
};
export const useModelLocationData = (
  project: ProjectKind | null,
  existingData?: ModelLocationData,
  setModelLocationDataState?: (data: ModelLocationData | undefined) => void,
): ModelLocationDataField => {
  const [modelLocationData, setModelLocationData] = React.useState<ModelLocationData | undefined>(
    existingData,
  );
  const [fetchedConnections] = useServingConnections(project?.metadata.name ?? '');
  const { connections } = useLabeledConnections(undefined, fetchedConnections);
  const selectedConnection = React.useMemo(() => {
    if (
      modelLocationData?.type === ModelLocationType.EXISTING &&
      isExistingModelLocation(modelLocationData)
    ) {
      return connections.find(
        (c) => getResourceNameFromK8sResource(c.connection) === modelLocationData.connection,
      );
    }
    return undefined;
  }, [connections, modelLocationData]);
  const updateSelectedConnection = React.useCallback(
    (connection: LabeledConnection | undefined, connectionTypes: ConnectionTypeConfigMapObj[]) => {
      const connectionTypeRef = getConnectionTypeRef(connection?.connection);
      const actualConnectionType = connectionTypes.find(
        (ct) => ct.metadata.name === connectionTypeRef,
      );
      if (connection && setModelLocationDataState && actualConnectionType) {
        setModelLocationData({
          type: ModelLocationType.EXISTING,
          connectionTypeObject: actualConnectionType,
          connection: getResourceNameFromK8sResource(connection.connection),
          fieldValues: {},
          additionalFields: {},
        });
      }
    },
    [setModelLocationData],
  );
  return {
    data: modelLocationData,
    setData: setModelLocationData,
    connections,
    setSelectedConnection: (
      connection: LabeledConnection | undefined,
      connectionTypes: ConnectionTypeConfigMapObj[],
    ) => {
      updateSelectedConnection(connection, connectionTypes);
    },
    selectedConnection,
  };
};

export const isValidModelLocationData = (
  modelLocation: ModelLocationData['type'],
  modelLocationData?: ModelLocationData,
): boolean => {
  if (!modelLocationData) return false;
  switch (modelLocation) {
    case ModelLocationType.EXISTING:
      return (
        modelLocationData.type === ModelLocationType.EXISTING &&
        !!modelLocationData.connection &&
        hasRequiredAdditionalFields(modelLocationData)
      );
    case ModelLocationType.PVC:
      return (
        modelLocationData.type === ModelLocationType.PVC &&
        hasRequiredAdditionalFields(modelLocationData)
      );
    default:
      return (
        modelLocationData.type === ModelLocationType.NEW &&
        hasRequiredConnectionTypeFields(modelLocationData) &&
        hasRequiredAdditionalFields(modelLocationData)
      );
  }
};

const hasRequiredConnectionTypeFields = (modelLocationData: ModelLocationData): boolean => {
  const dataFields =
    modelLocationData.connectionTypeObject.data?.fields?.filter(
      (field): field is ConnectionTypeDataField => 'envVar' in field && 'required' in field,
    ) || [];

  const requiredFields = dataFields.filter((field) => field.required).map((field) => field.envVar);

  return requiredFields.every((fieldName) => {
    const value = modelLocationData.fieldValues[fieldName];
    return value !== undefined && String(value).trim() !== '';
  });
};

const hasRequiredAdditionalFields = (modelLocationData: ModelLocationData): boolean => {
  if (
    isModelServingCompatible(
      modelLocationData.connectionTypeObject,
      ModelServingCompatibleTypes.S3ObjectStorage,
    )
  ) {
    return !!modelLocationData.additionalFields.modelPath;
  }
  if (
    isModelServingCompatible(
      modelLocationData.connectionTypeObject,
      ModelServingCompatibleTypes.OCI,
    )
  ) {
    return !!modelLocationData.additionalFields.modelUri;
  }
  return true;
};

export const modelLocationDataSchema = z.object({
  modelLocationData: z.custom<ModelLocationData>((val) => {
    return isValidModelLocationData(val.modelLocation, val.modelLocationData);
  }),
});

type ModelLocationInputFieldsProps = {
  modelLocation: ModelLocationData['type'];
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
  if (modelLocation === ModelLocationType.NEW) {
    if (selectedConnectionType) {
      return (
        <NewConnectionField
          connectionType={selectedConnectionType}
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

  return <div>Connection type not found</div>;
};
