import { AlertVariant } from '@patternfly/react-core';
import React from 'react';
import { Connection } from '~/concepts/connectionTypes/types';
import { ProjectKind } from '~/k8sTypes';
import { RegisteredModelDeployInfo } from '~/pages/modelRegistry/screens/RegisteredModels/useRegisteredModelDeployInfo';
import {
  CreatingInferenceServiceObject,
  InferenceServiceStorageType,
  LabeledConnection,
} from '~/pages/modelServing/screens/types';
import { AwsKeys, EMPTY_AWS_SECRET_DATA } from '~/pages/projects/dataConnections/const';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import useConnections from '~/pages/projects/screens/detail/connections/useConnections';
import useLabeledConnections from './useLabeledConnections';

const usePrefillDeployModalConnectionFromModelRegistry = (
  projectContext: { currentProject: ProjectKind; connections: Connection[] } | undefined,
  createData: CreatingInferenceServiceObject,
  setCreateData: UpdateObjectAtPropAndValue<CreatingInferenceServiceObject>,
  registeredModelDeployInfo?: RegisteredModelDeployInfo,
): [LabeledConnection[], boolean, Error | undefined] => {
  const [fetchedConnections, connectionsLoaded, connectionsLoadError] = useConnections(
    projectContext ? undefined : createData.project,
    true,
  );
  const allConnections = projectContext?.connections || fetchedConnections;
  const { connections, storageFields } = useLabeledConnections(
    registeredModelDeployInfo?.modelArtifactUri,
    allConnections,
  );

  React.useEffect(() => {
    if (registeredModelDeployInfo?.modelArtifactUri) {
      setCreateData('name', registeredModelDeployInfo.modelName);
      const recommendedConnections = connections.filter(
        (dataConnection) => dataConnection.isRecommended,
      );

      if (!storageFields) {
        setCreateData('storage', {
          awsData: EMPTY_AWS_SECRET_DATA,
          dataConnection: '',
          path: '',
          type: InferenceServiceStorageType.EXISTING_STORAGE,
        });
      } else if (storageFields.s3Fields) {
        const prefilledKeys: (typeof EMPTY_AWS_SECRET_DATA)[number]['key'][] = [
          AwsKeys.NAME,
          AwsKeys.AWS_S3_BUCKET,
          AwsKeys.S3_ENDPOINT,
          AwsKeys.DEFAULT_REGION,
        ];
        const prefilledAWSData = [
          { key: AwsKeys.NAME, value: registeredModelDeployInfo.modelArtifactStorageKey || '' },
          { key: AwsKeys.AWS_S3_BUCKET, value: storageFields.s3Fields.bucket },
          { key: AwsKeys.S3_ENDPOINT, value: storageFields.s3Fields.endpoint },
          { key: AwsKeys.DEFAULT_REGION, value: storageFields.s3Fields.region || '' },
          ...EMPTY_AWS_SECRET_DATA.filter((item) => !prefilledKeys.includes(item.key)),
        ];
        if (recommendedConnections.length === 0) {
          setCreateData('storage', {
            awsData: prefilledAWSData,
            dataConnection: '',
            connectionType: registeredModelDeployInfo.modelLocationType,
            path: storageFields.s3Fields.path,
            type: InferenceServiceStorageType.NEW_STORAGE,
            alert: {
              type: AlertVariant.info,
              title:
                "We've auto-switched to create a new connection and pre-filled the details for you.",
              message:
                'Model location info is available in the registry but no matching connection in the project. So we automatically switched the option to create a new data connection and prefilled the information.',
            },
          });
        } else if (recommendedConnections.length === 1) {
          setCreateData('storage', {
            awsData: prefilledAWSData,
            dataConnection: recommendedConnections[0].connection.metadata.name,
            path: storageFields.s3Fields.path,
            type: InferenceServiceStorageType.EXISTING_STORAGE,
          });
        } else {
          setCreateData('storage', {
            awsData: prefilledAWSData,
            dataConnection: '',
            path: storageFields.s3Fields.path,
            type: InferenceServiceStorageType.EXISTING_STORAGE,
          });
        }
      } else if (storageFields.uri) {
        if (recommendedConnections.length === 0) {
          setCreateData('storage', {
            awsData: EMPTY_AWS_SECRET_DATA,
            uri: storageFields.uri,
            dataConnection: '',
            connectionType: registeredModelDeployInfo.modelLocationType,
            path: '',
            type: InferenceServiceStorageType.NEW_STORAGE,
            alert: {
              type: AlertVariant.info,
              title:
                "We've auto-switched to create a new connection and pre-filled the details for you.",
              message:
                'Model location info is available in the registry but no matching connection in the project. So we automatically switched the option to create a new data connection and prefilled the information.',
            },
          });
        } else if (recommendedConnections.length === 1) {
          setCreateData('storage', {
            uri: storageFields.uri,
            awsData: EMPTY_AWS_SECRET_DATA,
            dataConnection: recommendedConnections[0].connection.metadata.name,
            path: '',
            type: InferenceServiceStorageType.EXISTING_URI,
          });
        } else {
          setCreateData('storage', {
            uri: storageFields.uri,
            awsData: EMPTY_AWS_SECRET_DATA,
            dataConnection: '',
            connectionType: registeredModelDeployInfo.modelLocationType,
            path: '',
            type: InferenceServiceStorageType.EXISTING_STORAGE,
          });
        }
      }
    }
  }, [connections, storageFields, registeredModelDeployInfo, setCreateData]);

  return [connections, connectionsLoaded, connectionsLoadError];
};

export default usePrefillDeployModalConnectionFromModelRegistry;
