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
  parseConnectionSecretValues,
} from '@odh-dashboard/internal/concepts/connectionTypes/utils';
import { z } from 'zod';
import { ConnectionOciAlert } from '@odh-dashboard/internal/pages/modelServing/screens/projects/InferenceServiceModal/ConnectionOciAlert';
import { PersistentVolumeClaimKind } from '@odh-dashboard/internal/k8sTypes';
import {
  getPVCNameFromURI,
  isPVCUri,
} from '@odh-dashboard/internal/pages/modelServing/screens/projects/utils';
import { useWatchConnectionTypes } from '@odh-dashboard/internal/utilities/useWatchConnectionTypes';
import useServingConnections from '@odh-dashboard/internal/pages/projects/screens/detail/connections/useServingConnections';
import { getResourceNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import { isGeneratedSecretName } from '@odh-dashboard/internal/api/k8s/secrets';
import { containsOnlySlashes, isS3PathValid } from '@odh-dashboard/internal/utilities/string';
import { ExistingConnectionField } from './modelLocationFields/ExistingConnectionField';
import NewConnectionField from './modelLocationFields/NewConnectionField';
import { PvcSelectField } from './modelLocationFields/PVCSelectField';
import { CustomTypeSelectField } from './modelLocationFields/CustomTypeSelectField';
import { ConnectionTypeRefs, ModelLocationData, ModelLocationType } from '../types';

export type ModelLocationDataField = {
  data: ModelLocationData | undefined;
  setData: (data: ModelLocationData | undefined) => void;
  projectName?: string;
  connections: Connection[];
  connectionsLoaded: boolean;
  connectionTypes: ConnectionTypeConfigMapObj[];
  connectionTypesLoaded: boolean;
  selectedConnection: Connection | undefined;
  setSelectedConnection: (connection: Connection | undefined) => void;
  isLoadingSecretData: boolean;
};
export const useModelLocationData = (
  projectName?: string,
  existingData?: ModelLocationData,
): ModelLocationDataField => {
  const [modelLocationData, setModelLocationData] = React.useState<ModelLocationData | undefined>(
    existingData,
  );
  const [connectionTypes, connectionTypesLoaded] = useWatchConnectionTypes(true);
  const [connections, connectionsLoaded] = useServingConnections(projectName, true, true);

  const [isStableState, setIsStableState] = React.useState(
    connectionTypesLoaded && connectionsLoaded,
  );
  const [prefillApplied, setPrefillApplied] = React.useState(false);
  React.useEffect(() => {
    if (!projectName || !connectionsLoaded || !connectionTypesLoaded) {
      return;
    }
    if (prefillApplied) return;
    if (!existingData) {
      // new deployment
      setIsStableState(true);
      setPrefillApplied(true);
      return;
    }

    const fetchConnectionData = async () => {
      if (existingData.type === ModelLocationType.PVC) {
        setIsStableState(true);
        setPrefillApplied(true);
        return;
      }
      if (existingData.type === ModelLocationType.NEW) {
        // Setting connection type object as URI by default, get reset later if it's something else
        const connectionTypeObject = connectionTypes.find(
          (ct) => ct.metadata.name === ConnectionTypeRefs.URI,
        );
        if (connectionTypeObject) {
          setModelLocationData({
            ...existingData,
            connectionTypeObject,
          });
        }
        setIsStableState(true);
        setPrefillApplied(true);
        return;
      }

      setIsStableState(false);
      try {
        const connectionName = existingData.connection;
        if (!connectionName) {
          return;
        }

        if (
          modelLocationData?.type === ModelLocationType.EXISTING &&
          modelLocationData.connection !== connectionName
        ) {
          setIsStableState(true);
          return;
        }

        const secret = connections.find((c) => c.metadata.name === existingData.connection);
        if (!secret) {
          return;
        }

        const connectionTypeRef = getConnectionTypeRef(secret);
        const connectionType = connectionTypes.find((ct) => ct.metadata.name === connectionTypeRef);
        const values = parseConnectionSecretValues(secret, connectionType);
        const isGeneratedSecret = isGeneratedSecretName(secret.metadata.name);
        const hasOwnerRef = !!secret.metadata.ownerReferences?.length || isGeneratedSecret;

        const newState = {
          type: hasOwnerRef ? ModelLocationType.NEW : ModelLocationType.EXISTING,
          fieldValues: values,
          connectionTypeObject: connectionType,
          additionalFields: existingData.additionalFields,
          ...(hasOwnerRef ? {} : { connection: connectionName.toString() }),
        };

        setModelLocationData(newState);
        setPrefillApplied(true);
      } catch (e) {
        console.error('Failed to fetch secret data:', e);
      } finally {
        setIsStableState(true);
      }
    };

    fetchConnectionData();
  }, [existingData, projectName, connectionsLoaded, connectionTypesLoaded]);

  const initialConnection = React.useMemo(() => {
    if (connectionsLoaded && existingData?.type === ModelLocationType.EXISTING) {
      return connections.find((c) => getResourceNameFromK8sResource(c) === existingData.connection);
    }
    return undefined;
  }, [connections, connectionsLoaded, existingData]);

  // For user selecting a connection
  const [userSelectedConnection, setUserSelectedConnection] = React.useState<
    Connection | undefined
  >();

  const selectedConnection = userSelectedConnection ?? initialConnection;

  const updateSelectedConnection = React.useCallback(
    (connection: Connection | undefined) => {
      setPrefillApplied(true);
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
    projectName,
    connections,
    connectionsLoaded,
    connectionTypes,
    connectionTypesLoaded,
    selectedConnection,
    setSelectedConnection: updateSelectedConnection,
    isLoadingSecretData: !isStableState && !!projectName,
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
  if (!modelLocationData.connectionTypeObject) return false;
  const dataFields =
    modelLocationData.connectionTypeObject.data?.fields?.filter(
      (field): field is ConnectionTypeDataField => 'envVar' in field && 'required' in field,
    ) || [];

  const requiredFields = dataFields.filter((field) => field.required).map((field) => field.envVar);
  if (
    isModelServingCompatible(
      modelLocationData.connectionTypeObject,
      ModelServingCompatibleTypes.S3ObjectStorage,
    )
  ) {
    requiredFields.push('AWS_S3_BUCKET');
  }

  return requiredFields.every((fieldName) => {
    const value = modelLocationData.fieldValues[fieldName];
    if (fieldName === 'URI') {
      return value !== undefined && String(value).includes('://');
    }
    if (fieldName === 'Bucket') {
      return value !== undefined && String(value).trim() !== '';
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
    return (
      !!modelLocationData.additionalFields.modelPath &&
      isS3PathValid(modelLocationData.additionalFields.modelPath ?? '') &&
      !containsOnlySlashes(modelLocationData.additionalFields.modelPath ?? '')
    );
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
  showCustomTypeSelect: boolean;
  customTypeOptions?: ConnectionTypeConfigMapObj[];
  customTypeKey: string | undefined;
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
  showCustomTypeSelect,
  customTypeOptions,
  customTypeKey,
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
    return (
      <>
        {showCustomTypeSelect ? (
          <CustomTypeSelectField
            typeOptions={customTypeOptions ?? []}
            onSelect={(connectionType: ConnectionTypeConfigMapObj) => {
              setModelLocationData({
                type: ModelLocationType.NEW,
                connectionTypeObject: connectionType,
                fieldValues: {},
                additionalFields: {},
              });
            }}
            typeKey={customTypeKey ?? ''}
            selectedConnectionType={selectedConnectionType}
          />
        ) : null}
        {selectedConnectionType ? (
          <NewConnectionField
            connectionType={selectedConnectionType}
            setModelLocationData={setModelLocationData}
            modelLocationData={modelLocationData}
          />
        ) : null}
      </>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (modelLocation === ModelLocationType.PVC) {
    return (
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
    );
  }

  return <Alert variant="warning" title="There was a problem fetching connections" />;
};
