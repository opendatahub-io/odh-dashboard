import * as React from 'react';
import { FormGroup } from '@patternfly/react-core';
import {
  ConnectionTypeConfigMapObj,
  ConnectionTypeDataField,
  ConnectionTypeValueType,
} from '@odh-dashboard/internal/concepts/connectionTypes/types';
import { OCIConnectionTypeKeys } from '@odh-dashboard/internal/concepts/connectionTypes/utils';
import ConnectionTypeFormFields from '@odh-dashboard/internal/concepts/connectionTypes/fields/ConnectionTypeFormFields';
import ConnectionOciPathField from '@odh-dashboard/internal/pages/modelServing/screens/projects/InferenceServiceModal/ConnectionOciPathField';
import ConnectionS3FolderPathField from '@odh-dashboard/internal/pages/modelServing/screens/projects/InferenceServiceModal/ConnectionS3FolderPathField';
import { ModelLocationData, ModelLocationType, ConnectionTypeRefs } from './types';
import { isOCIModelLocation, isS3ModelLocation } from '../../utils';

type Props = {
  modelLocationType: ModelLocationType;
  setModelLocationData: (data: ModelLocationData | undefined) => void;
  modelLocationData?: ModelLocationData;
  connectionType: ConnectionTypeConfigMapObj;
};

const NewConnectionField: React.FC<Props> = ({
  modelLocationType,
  setModelLocationData,
  modelLocationData,
  connectionType,
}) => {
  const connectionValues = React.useMemo(() => {
    if (!modelLocationData) return {};

    switch (modelLocationData.type) {
      case ModelLocationType.S3:
        if (isS3ModelLocation(modelLocationData)) {
          return {
            AWS_ACCESS_KEY_ID: modelLocationData.accessKey || '',
            AWS_SECRET_ACCESS_KEY: modelLocationData.secretKey || '',
            AWS_S3_ENDPOINT: modelLocationData.endpoint || '',
            AWS_DEFAULT_REGION: modelLocationData.region || '',
            AWS_S3_BUCKET: modelLocationData.bucket || '',
          };
        }
        return {};
      case ModelLocationType.OCI:
        if (isOCIModelLocation(modelLocationData)) {
          return {
            [OCIConnectionTypeKeys[0]]: modelLocationData.secretDetails || '',
            OCI_HOST: modelLocationData.registryHost || '',
            ACCESS_TYPE: modelLocationData.accessType || [],
          };
        }
        return {};
      case ModelLocationType.URI:
        return { URI: modelLocationData.uri || '' };
      default:
        return {};
    }
  }, [modelLocationData]);

  const handleFieldChange = (field: ConnectionTypeDataField, value: ConnectionTypeValueType) => {
    let updatedData: ModelLocationData;

    switch (modelLocationType) {
      case ModelLocationType.S3:
        updatedData = {
          type: ModelLocationType.S3,
          accessKey: '',
          secretKey: '',
          endpoint: '',
          region: '',
          bucket: '',
          path: '',
        };

        if (isS3ModelLocation(modelLocationData)) {
          updatedData = { ...modelLocationData };
        }
        switch (field.envVar) {
          case 'AWS_ACCESS_KEY_ID':
            updatedData.accessKey = String(value);
            break;
          case 'AWS_SECRET_ACCESS_KEY':
            updatedData.secretKey = String(value);
            break;
          case 'AWS_S3_ENDPOINT':
            updatedData.endpoint = String(value);
            break;
          case 'AWS_DEFAULT_REGION':
            updatedData.region = String(value);
            break;
          case 'AWS_S3_BUCKET':
            updatedData.bucket = String(value);
            break;
          case 'AWS_S3_FOLDER_PATH':
            updatedData.path = String(value);
            break;
        }
        break;

      case ModelLocationType.OCI:
        updatedData = {
          type: ModelLocationType.OCI,
          secretDetails: '',
          registryHost: '',
          uri: '',
          accessType: [],
        };

        if (isOCIModelLocation(modelLocationData)) {
          updatedData = { ...modelLocationData };
        }

        switch (field.envVar) {
          case OCIConnectionTypeKeys[0]:
            updatedData.secretDetails = String(value);
            break;
          case 'OCI_HOST':
            updatedData.registryHost = String(value);
            break;
          case 'OCI_MODEL_URI':
            updatedData.uri = String(value);
            break;
          case 'ACCESS_TYPE':
            updatedData.accessType = Array.isArray(value) ? value : [String(value)];
            break;
        }
        break;

      case ModelLocationType.URI:
        updatedData = {
          type: ModelLocationType.URI,
          uri: '',
        };

        if (modelLocationData && modelLocationData.type === ModelLocationType.URI) {
          updatedData = { ...modelLocationData };
        }

        if (field.envVar === 'URI') {
          updatedData.uri = String(value);
        }
        break;

      default:
        updatedData = {
          type: ModelLocationType.URI,
          uri: '',
        };
    }

    setModelLocationData(updatedData);
  };
  const renderAdditionalFields = () => {
    if (connectionType.metadata.name === ConnectionTypeRefs.OCI) {
      return (
        <ConnectionOciPathField
          ociHost={connectionValues.OCI_HOST}
          modelUri={isOCIModelLocation(modelLocationData) ? modelLocationData.uri : ''}
          setModelUri={(modelPath) => {
            if (isOCIModelLocation(modelLocationData)) {
              setModelLocationData({
                ...modelLocationData,
                uri: modelPath ?? '',
              });
            } else {
              setModelLocationData({
                type: ModelLocationType.OCI,
                secretDetails: '',
                registryHost: '',
                uri: modelPath ?? '',
                accessType: [],
              });
            }
          }}
          isNewConnection
        />
      );
    }
    if (connectionType.metadata.name === ConnectionTypeRefs.S3) {
      return (
        <ConnectionS3FolderPathField
          folderPath={isS3ModelLocation(modelLocationData) ? modelLocationData.path : ''}
          setFolderPath={(path) => {
            if (isS3ModelLocation(modelLocationData)) {
              setModelLocationData({
                ...modelLocationData,
                path,
              });
            } else {
              setModelLocationData({
                type: ModelLocationType.S3,
                accessKey: '',
                secretKey: '',
                endpoint: '',
                region: '',
                bucket: '',
                path,
              });
            }
          }}
        />
      );
    }
    return undefined;
  };

  return (
    <FormGroup>
      <ConnectionTypeFormFields
        fields={connectionType.data?.fields}
        isPreview={false}
        onChange={handleFieldChange}
        connectionValues={connectionValues}
      />
      {renderAdditionalFields()}
    </FormGroup>
  );
};

export default NewConnectionField;
