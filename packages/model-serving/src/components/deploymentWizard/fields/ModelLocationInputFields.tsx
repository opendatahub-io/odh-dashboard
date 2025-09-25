import React from 'react';
import { Alert } from '@patternfly/react-core';
import {
  Connection,
  ConnectionTypeConfigMapObj,
  ConnectionTypeDataField,
} from '@odh-dashboard/internal/concepts/connectionTypes/types';
import {
  getConnectionTypeRef,
  isModelServingCompatible,
  ModelServingCompatibleTypes,
} from '@odh-dashboard/internal/concepts/connectionTypes/utils';
import { z } from 'zod';
import { ConnectionOciAlert } from '@odh-dashboard/internal/pages/modelServing/screens/projects/InferenceServiceModal/ConnectionOciAlert';
import { PersistentVolumeClaimKind, ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import {
  getPVCNameFromURI,
  isPVCUri,
} from '@odh-dashboard/internal/pages/modelServing/screens/projects/utils';
import { useWatchConnectionTypes } from '@odh-dashboard/internal/utilities/useWatchConnectionTypes';
import useServingConnections from '@odh-dashboard/internal/pages/projects/screens/detail/connections/useServingConnections';
import { getResourceNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import { ExistingConnectionField } from './modelLocationFields/ExistingConnectionField';
import { ModelLocationData, ModelLocationType } from './modelLocationFields/types';
import NewConnectionField from './modelLocationFields/NewConnectionField';
import { PvcSelectField } from './modelLocationFields/PVCSelectField';

export type ModelLocationDataField = {
  data: ModelLocationData | undefined;
  setData: (data: ModelLocationData | undefined) => void;
  project: ProjectKind | null;
  connections: Connection[];
  connectionsLoaded: boolean;
  connectionTypes: ConnectionTypeConfigMapObj[];
  selectedConnection: Connection | undefined;
  setSelectedConnection: (connection: Connection | undefined) => void;
};
export const useModelLocationData = (
  project: ProjectKind | null,
  existingData?: ModelLocationData,
): ModelLocationDataField => {
  const [modelLocationData, setModelLocationData] = React.useState<ModelLocationData | undefined>(
    existingData,
  );
  const [connectionTypes] = useWatchConnectionTypes(true);
  const [connections, connectionsLoaded] = useServingConnections(project?.metadata.name);

  const initialConnection = React.useMemo(() => {
    if (connectionsLoaded && existingData?.type === ModelLocationType.EXISTING) {
      return connections.find((c) => getResourceNameFromK8sResource(c) === existingData.connection);
    }
    return undefined;
  }, [connections, connectionsLoaded, existingData]);

  // For getting the initial connection
  const loadedConnection = React.useMemo(() => initialConnection, [initialConnection]);

  // For user selecting a connection
  const [userSelectedConnection, setUserSelectedConnection] = React.useState<
    Connection | undefined
  >();

  const selectedConnection = userSelectedConnection ?? loadedConnection;

  const updateSelectedConnection = React.useCallback(
    (connection: Connection | undefined) => {
      if (!connection) {
        setUserSelectedConnection(undefined);
        return;
      }
      const connectionTypeRef = getConnectionTypeRef(connection);
      const selectedConnectionType = connectionTypes.find(
        (ct) => ct.metadata.name === connectionTypeRef,
      );
      if (selectedConnectionType) {
        setUserSelectedConnection(connection);
        setModelLocationData({
          type: ModelLocationType.EXISTING,
          connectionTypeObject: selectedConnectionType,
          connection: getResourceNameFromK8sResource(connection),
          fieldValues: {},
          additionalFields: {},
        });
      }
    },
    [setModelLocationData, connectionTypes, setUserSelectedConnection],
  );

  return {
    data: modelLocationData,
    setData: setModelLocationData,
    project,
    connections,
    connectionsLoaded,
    connectionTypes,
    selectedConnection,
    setSelectedConnection: updateSelectedConnection,
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
        !!modelLocationData.additionalFields.pvcConnection &&
        !!modelLocationData.fieldValues.URI &&
        isPVCUri(String(modelLocationData.fieldValues.URI)) &&
        String(modelLocationData.fieldValues.URI).startsWith(
          `pvc://${modelLocationData.additionalFields.pvcConnection}/`,
        )
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
    modelLocationData.connectionTypeObject?.data?.fields?.filter(
      (field): field is ConnectionTypeDataField => 'envVar' in field && 'required' in field,
    ) || [];

  const requiredFields = dataFields.filter((field) => field.required).map((field) => field.envVar);

  return requiredFields.every((fieldName) => {
    const value = modelLocationData.fieldValues[fieldName];
    if (fieldName === 'URI') {
      return value !== undefined && String(value).includes('://');
    }
    return value !== undefined && String(value).trim() !== '';
  });
};

const hasRequiredAdditionalFields = (
  modelLocationData: ModelLocationData,
  modelLocationType?: ModelLocationType,
): boolean => {
  if (
    modelLocationData.connectionTypeObject &&
    isModelServingCompatible(
      modelLocationData.connectionTypeObject,
      ModelServingCompatibleTypes.S3ObjectStorage,
    )
  ) {
    return !!modelLocationData.additionalFields.modelPath;
  }
  if (
    modelLocationData.connectionTypeObject &&
    isModelServingCompatible(
      modelLocationData.connectionTypeObject,
      ModelServingCompatibleTypes.OCI,
    )
  ) {
    return !!modelLocationData.additionalFields.modelUri;
  }
  if (modelLocationType === ModelLocationType.PVC) {
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
  connections: Connection[];
  connectionTypes: ConnectionTypeConfigMapObj[];
  selectedConnection: Connection | undefined;
  setSelectedConnection: (connection: Connection) => void;
  selectedConnectionType: ConnectionTypeConfigMapObj | undefined;
  setModelLocationData: (data: ModelLocationData | undefined) => void;
  resetModelLocationData: () => void;
  modelLocationData?: ModelLocationData;
  pvcs: PersistentVolumeClaimKind[];
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
  pvcs,
}) => {
  const pvcNameFromUri: string | undefined = React.useMemo(() => {
    // Get the PVC name from the URI if it's a PVC URI
    if (modelLocationData?.fieldValues.URI && isPVCUri(String(modelLocationData.fieldValues.URI))) {
      return getPVCNameFromURI(String(modelLocationData.fieldValues.URI));
    }
    return undefined;
  }, [modelLocationData?.fieldValues.URI]);

  const selectedPVC = React.useMemo(
    () =>
      pvcs.find((pvc) => {
        // If user has selected a PVC connection, use that
        if (modelLocationData?.additionalFields.pvcConnection) {
          return pvc.metadata.name === modelLocationData.additionalFields.pvcConnection;
        }
        // Otherwise, if we have an existing URI, try to find the PVC from that
        if (modelLocationData?.fieldValues.URI) {
          return pvc.metadata.name === pvcNameFromUri;
        }
        // If there's no selected PVC and no URI, there is no selected PVC
        return undefined;
      }),
    [
      pvcs,
      modelLocationData?.fieldValues.URI,
      pvcNameFromUri,
      modelLocationData?.additionalFields.pvcConnection,
    ],
  );

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
      <>
        <PvcSelectField
          pvcs={pvcs}
          selectedPVC={selectedPVC}
          pvcNameFromUri={pvcNameFromUri}
          existingUriOption={modelLocationData?.fieldValues.URI?.toString()}
          onSelect={(selection?: PersistentVolumeClaimKind | undefined) => {
            setModelLocationData({
              type: ModelLocationType.PVC,
              fieldValues: {
                URI: selection ? `pvc://${selection.metadata.name}/` : '',
              },
              additionalFields: {
                pvcConnection: selection?.metadata.name ?? '',
              },
            });
          }}
          setModelUri={(uri: string) => {
            setModelLocationData({
              type: ModelLocationType.PVC,
              fieldValues: {
                URI: uri || '',
              },
              additionalFields: {
                pvcConnection: modelLocationData?.additionalFields.pvcConnection ?? '',
              },
            });
          }}
        />
      </>
    );
  }

  return <Alert variant="warning" title="There was a problem fetching connections" />;
};
