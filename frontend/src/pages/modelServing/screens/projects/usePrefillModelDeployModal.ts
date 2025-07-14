import { AlertVariant } from '@patternfly/react-core';
import React from 'react';
import {
  Connection,
  ConnectionTypeConfigMapObj,
  ConnectionTypeValueType,
} from '#~/concepts/connectionTypes/types';
import { ProjectKind } from '#~/k8sTypes';
import {
  CreatingInferenceServiceObject,
  InferenceServiceStorageType,
} from '#~/pages/modelServing/screens/types';
import {
  AccessTypes,
  AwsKeys,
  EMPTY_AWS_SECRET_DATA,
} from '#~/pages/projects/dataConnections/const';
import { UpdateObjectAtPropAndValue } from '#~/pages/projects/types';
import { isRedHatRegistryUri } from '#~/pages/modelRegistry/screens/utils';
import {
  getMRConnectionValues,
  OCIAccessTypeKey,
  OCIConnectionTypeKeys,
  S3ConnectionTypeKeys,
  URIConnectionTypeKeys,
  withRequiredFields,
} from '#~/concepts/connectionTypes/utils';
import { useWatchConnectionTypes } from '#~/utilities/useWatchConnectionTypes';
import { getResourceNameFromK8sResource } from '#~/concepts/k8s/utils';
import { PrefilledConnection } from '#~/concepts/modelRegistry/utils';
import useServingConnections from '#~/pages/projects/screens/detail/connections/useServingConnections';
import useLabeledConnections from './useLabeledConnections';

export type ModelDeployPrefillInfo = {
  modelName: string;
  modelFormat?: string;
  modelArtifactUri?: string;
  connectionTypeName?: string;
  initialConnectionName?: string;
  modelRegistryInfo?: {
    modelVersionId?: string;
    registeredModelId?: string;
    mrName?: string;
  };
};

const usePrefillModelDeployModal = (
  projectContext: { currentProject: ProjectKind; connections: Connection[] } | undefined,
  createData: CreatingInferenceServiceObject,
  setCreateData: UpdateObjectAtPropAndValue<CreatingInferenceServiceObject>,
  modelDeployPrefillInfo?: ModelDeployPrefillInfo,
): PrefilledConnection => {
  const [fetchedConnections, connectionsLoaded, connectionsLoadError] = useServingConnections(
    projectContext ? projectContext.currentProject.metadata.name : createData.project,
  );
  const { connections, modelLocation } = useLabeledConnections(
    modelDeployPrefillInfo?.modelArtifactUri,
    fetchedConnections,
  );
  const [connectionTypes, connectionTypesLoaded, connectionTypeError] =
    useWatchConnectionTypes(true);
  const [initialNewConnectionType, setInitialNewConnectionType] = React.useState<
    ConnectionTypeConfigMapObj | undefined
  >(undefined);
  const [initialNewConnectionValues, setinitialNewConnectionValues] = React.useState<{
    [key: string]: ConnectionTypeValueType;
  }>({});
  const loaded = connectionsLoaded && connectionTypesLoaded;
  const loadError = connectionsLoadError || connectionTypeError;

  // Add a hasPrefilledRef to track whether the form has been prefilled
  // This prevents the connection type from switching back to Current URI
  const hasPrefilledRef = React.useRef(false);

  React.useEffect(() => {
    const alert = {
      type: AlertVariant.info,
      title: "We've populated the details of a new connection for you.",
      message:
        'The selected project does not have a connection that matches the model location. You can create a matching connection by using the data in the autopopulated fields, or edit the fields to create a different connection. Alternatively, click Existing connection to select an existing non-matching connection.',
    };

    // Only run this effect if we have modelDeployPrefillInfo and haven't prefilled yet
    if (modelDeployPrefillInfo?.modelArtifactUri && loaded && !hasPrefilledRef.current) {
      hasPrefilledRef.current = true;
      setCreateData('name', modelDeployPrefillInfo.modelName);
      const recommendedConnections = connections.filter(
        (dataConnection) => dataConnection.isRecommended,
      );

      const connectionName = modelDeployPrefillInfo.initialConnectionName || '';

      if (!modelLocation) {
        setCreateData('storage', {
          awsData: EMPTY_AWS_SECRET_DATA,
          dataConnection: '',
          path: '',
          type: InferenceServiceStorageType.EXISTING_STORAGE,
        });
      } else if (modelLocation.s3Fields) {
        const prefilledKeys: (typeof EMPTY_AWS_SECRET_DATA)[number]['key'][] = [
          AwsKeys.NAME,
          AwsKeys.AWS_S3_BUCKET,
          AwsKeys.S3_ENDPOINT,
          AwsKeys.DEFAULT_REGION,
        ];
        const prefilledAWSData = [
          { key: AwsKeys.NAME, value: connectionName },
          { key: AwsKeys.AWS_S3_BUCKET, value: modelLocation.s3Fields.bucket },
          { key: AwsKeys.S3_ENDPOINT, value: modelLocation.s3Fields.endpoint },
          { key: AwsKeys.DEFAULT_REGION, value: modelLocation.s3Fields.region || '' },
          ...EMPTY_AWS_SECRET_DATA.filter((item) => !prefilledKeys.includes(item.key)),
        ];
        if (recommendedConnections.length === 0) {
          setCreateData('storage', {
            awsData: prefilledAWSData,
            dataConnection: connectionName,
            path: modelLocation.s3Fields.path,
            type: InferenceServiceStorageType.NEW_STORAGE,
            alert,
          });
          setInitialNewConnectionType(
            withRequiredFields(
              connectionTypes.find(
                (t) =>
                  getResourceNameFromK8sResource(t) === modelDeployPrefillInfo.connectionTypeName,
              ),
              S3ConnectionTypeKeys,
            ),
          );
          setinitialNewConnectionValues(getMRConnectionValues(prefilledAWSData));
        } else if (recommendedConnections.length === 1) {
          setCreateData('storage', {
            awsData: prefilledAWSData,
            dataConnection: recommendedConnections[0].connection.metadata.name,
            path: modelLocation.s3Fields.path,
            type: InferenceServiceStorageType.EXISTING_STORAGE,
          });
        } else {
          setCreateData('storage', {
            awsData: prefilledAWSData,
            dataConnection: '',
            path: modelLocation.s3Fields.path,
            type: InferenceServiceStorageType.EXISTING_STORAGE,
          });
        }
      } else if (modelLocation.uri) {
        if (recommendedConnections.length === 0) {
          setCreateData('storage', {
            awsData: EMPTY_AWS_SECRET_DATA,
            uri: '',
            dataConnection: connectionName,
            path: '',
            type: InferenceServiceStorageType.NEW_STORAGE,
            alert,
          });
          setInitialNewConnectionType(
            withRequiredFields(
              connectionTypes.find(
                (t) =>
                  getResourceNameFromK8sResource(t) === modelDeployPrefillInfo.connectionTypeName,
              ),
              URIConnectionTypeKeys,
            ),
          );
          setinitialNewConnectionValues(getMRConnectionValues(modelLocation.uri));
        } else if (recommendedConnections.length === 1) {
          setCreateData('storage', {
            uri: modelLocation.uri,
            awsData: EMPTY_AWS_SECRET_DATA,
            dataConnection: recommendedConnections[0].connection.metadata.name,
            path: '',
            type: InferenceServiceStorageType.EXISTING_STORAGE,
          });
        } else {
          setCreateData('storage', {
            uri: modelLocation.uri,
            awsData: EMPTY_AWS_SECRET_DATA,
            dataConnection: '',
            path: '',
            type: InferenceServiceStorageType.EXISTING_STORAGE,
          });
        }
      } else if (modelLocation.ociUri) {
        if (isRedHatRegistryUri(modelLocation.ociUri)) {
          setCreateData('storage', {
            uri: modelLocation.ociUri,
            awsData: EMPTY_AWS_SECRET_DATA,
            dataConnection: '',
            path: '',
            type: InferenceServiceStorageType.EXISTING_URI,
          });
        } else if (recommendedConnections.length === 0) {
          setCreateData('storage', {
            awsData: EMPTY_AWS_SECRET_DATA,
            uri: modelLocation.ociUri,
            dataConnection: connectionName,
            path: '',
            type: InferenceServiceStorageType.NEW_STORAGE,
            alert,
          });
          setinitialNewConnectionValues({ [`${OCIAccessTypeKey}`]: [AccessTypes.PULL] });
          setInitialNewConnectionType(
            withRequiredFields(
              connectionTypes.find(
                (t) =>
                  getResourceNameFromK8sResource(t) === modelDeployPrefillInfo.connectionTypeName,
              ),
              OCIConnectionTypeKeys,
            ),
          );
        } else if (recommendedConnections.length === 1) {
          setCreateData('storage', {
            uri: modelLocation.ociUri,
            awsData: EMPTY_AWS_SECRET_DATA,
            dataConnection: recommendedConnections[0].connection.metadata.name,
            path: '',
            type: InferenceServiceStorageType.EXISTING_STORAGE,
          });
        } else {
          setCreateData('storage', {
            uri: modelLocation.ociUri,
            awsData: EMPTY_AWS_SECRET_DATA,
            dataConnection: '',
            path: '',
            type: InferenceServiceStorageType.EXISTING_STORAGE,
          });
        }
      }
    }
  }, [connections, modelLocation, modelDeployPrefillInfo, setCreateData, loaded, connectionTypes]);

  return {
    initialNewConnectionType,
    initialNewConnectionValues,
    connections,
    connectionsLoaded: loaded,
    connectionsLoadError: loadError,
  };
};

export default usePrefillModelDeployModal;
