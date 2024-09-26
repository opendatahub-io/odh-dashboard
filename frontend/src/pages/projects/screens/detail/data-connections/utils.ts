import * as React from 'react';
import { K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';
import { deleteSecret } from '~/api';
import { AWSSecretKind, KnownLabels, SecretKind } from '~/k8sTypes';
import { AwsKeys } from '~/pages/projects/dataConnections/const';
import {
  AWSDataEntry,
  DataConnection,
  DataConnectionAWS,
  DataConnectionType,
} from '~/pages/projects/types';
import { getDescriptionFromK8sResource, getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { DATA_CONNECTION_TYPES } from './connectionRenderers';

export const isSecretAWSSecretKind = (secret: SecretKind): secret is AWSSecretKind =>
  !!secret.metadata.labels?.[KnownLabels.DATA_CONNECTION_AWS] &&
  secret.metadata.annotations?.['opendatahub.io/connection-type'] === 's3';

export const isDataConnectionAWS = (
  dataConnection: DataConnection,
): dataConnection is DataConnectionAWS => dataConnection.type === DataConnectionType.AWS;

export const getDataConnectionId = (dataConnection: DataConnection): string => {
  if (isDataConnectionAWS(dataConnection)) {
    return dataConnection.data.metadata.uid || dataConnection.data.metadata.name;
  }

  throw new Error('Invalid data connection type');
};

export const getDataConnectionResourceName = (dataConnection: DataConnection): string => {
  if (isDataConnectionAWS(dataConnection)) {
    return dataConnection.data.metadata.name;
  }

  throw new Error('Invalid data connection type');
};

export const getDataConnectionDisplayName = (dataConnection: DataConnection): string => {
  if (isDataConnectionAWS(dataConnection)) {
    return getDisplayNameFromK8sResource(dataConnection.data);
  }

  throw new Error('Invalid data connection type');
};

export const getDataConnectionDescription = (dataConnection: DataConnection): string => {
  if (isDataConnectionAWS(dataConnection)) {
    return getDescriptionFromK8sResource(dataConnection.data);
  }

  return '';
};

export const getDataConnectionType = (dataConnection: DataConnection): React.ReactNode => {
  const connectionType = DATA_CONNECTION_TYPES[dataConnection.type];
  if (connectionType) {
    return connectionType;
  }

  throw new Error('Invalid data connection type');
};

export const deleteDataConnection = (dataConnection: DataConnection): Promise<K8sStatus> => {
  switch (dataConnection.type) {
    case DataConnectionType.AWS:
      return deleteSecret(
        dataConnection.data.metadata.namespace,
        dataConnection.data.metadata.name,
      );
    default:
      throw new Error('Invalid data connection type');
  }
};

export const convertAWSSecretData = (dataConnection: DataConnection): AWSDataEntry => {
  if (!isDataConnectionAWS(dataConnection)) {
    return [];
  }
  const secretData = dataConnection.data.data;
  const convertedData = Object.values(AwsKeys)
    .filter((key) => key !== AwsKeys.NAME)
    .map((key: AwsKeys) => ({
      key,
      value: secretData[key] ? atob(secretData[key]) : '',
    }));
  const convertedSecret: AWSDataEntry = [
    {
      key: AwsKeys.NAME,
      value: getDataConnectionDisplayName(dataConnection),
    },
    ...convertedData,
  ];
  return convertedSecret;
};
