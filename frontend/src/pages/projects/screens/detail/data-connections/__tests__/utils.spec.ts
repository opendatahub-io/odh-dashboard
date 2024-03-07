import { KnownLabels } from '~/k8sTypes';
import { DataConnection, DataConnectionType } from '~/pages/projects/types';
import {
  convertAWSSecretData,
  deleteDataConnection,
  getDataConnectionDescription,
  getDataConnectionDisplayName,
  getDataConnectionId,
  getDataConnectionResourceName,
  getDataConnectionType,
  isDataConnectionAWS,
  isSecretAWSSecretKind,
} from '~/pages/projects/screens/detail/data-connections/utils';
import { AwsKeys } from '~/pages/projects/dataConnections/const';
import { deleteSecret } from '~/api';
import { mockSecretK8sResource } from '~/__mocks__/mockSecretK8sResource';

import { genUID } from '~/__mocks__/mockUtils';
import { mock200Status, mock404Error } from '~/__mocks__/mockK8sStatus';

jest.mock('~/api', () => ({
  deleteSecret: jest.fn(),
}));

const deletesecretMock = jest.mocked(deleteSecret);

const dataConnection: DataConnection = {
  type: 0,
  data: {
    kind: 'Secret',
    apiVersion: 'v1',
    metadata: {
      name: 'test-secret',
      namespace: 'test-project',
      uid: genUID('secret'),
      resourceVersion: '5985371',
      creationTimestamp: '2023-03-22T16:18:56Z',
      labels: {
        [KnownLabels.DASHBOARD_RESOURCE]: 'true',
        [KnownLabels.DATA_CONNECTION_AWS]: 'true',
      },
      annotations: {
        'opendatahub.io/connection-type': 's3',
        'openshift.io/display-name': 'Test Secret',
      },
    },
    data: {
      [AwsKeys.NAME]: 'test-secret',
      AWS_ACCESS_KEY_ID: 'test',
      AWS_DEFAULT_REGION: 'region',
      AWS_S3_BUCKET: 'bucket',
      AWS_S3_ENDPOINT: 'endpoint',
      AWS_SECRET_ACCESS_KEY: 'test',
    },
    type: 'Opaque',
  },
};

const createDataConnection = (type: DataConnectionType) => ({
  ...dataConnection,
  type,
});

describe('isSecretAWSSecretKind', () => {
  it('should return false when secret is not AWSSecretKind', () => {
    const secret = mockSecretK8sResource({});
    secret.metadata.labels = {};
    const result = isSecretAWSSecretKind(secret);
    expect(result).toBe(false);
  });

  it('should return true when secret is AWSSecretKind', () => {
    const secret = mockSecretK8sResource({});
    const result = isSecretAWSSecretKind(secret);
    expect(result).toBe(true);
  });
});

describe('isDataConnectionAWS', () => {
  it('should return false when data connection is not AWS', () => {
    const result = isDataConnectionAWS(createDataConnection({} as DataConnectionType));
    expect(result).toBe(false);
  });

  it('should return true when data connection is AWS', () => {
    const result = isDataConnectionAWS(createDataConnection(DataConnectionType.AWS));
    expect(result).toBe(true);
  });
});

describe('getDataConnectionId', () => {
  it('should return uid when data connection is AWS', () => {
    const result = getDataConnectionId(dataConnection);
    expect(result).not.toBe(null);
  });

  it('should return name when data connection is AWS', () => {
    dataConnection.data.metadata.uid = '';
    const result = getDataConnectionId(dataConnection);
    expect(result).toBe('test-secret');
  });

  it('should return error when data connection is not AWS', () => {
    expect(() => {
      getDataConnectionId(createDataConnection({} as DataConnectionType));
    }).toThrow('Invalid data connection type');
  });
});

describe('getDataConnectionResourceName', () => {
  it('should return data connection resource name when data connection is AWS', () => {
    const result = getDataConnectionResourceName(createDataConnection(DataConnectionType.AWS));
    expect(result).toBe('test-secret');
  });

  it('should return error when data connection is not AWS', () => {
    expect(() => {
      getDataConnectionResourceName(createDataConnection({} as DataConnectionType));
    }).toThrow('Invalid data connection type');
  });
});

describe('getDataConnectionDisplayName', () => {
  it('should return data connection display name when data connection is AWS', () => {
    const result = getDataConnectionDisplayName(createDataConnection(DataConnectionType.AWS));
    expect(result).toBe('Test Secret');
  });

  it('should return error when data connection is not AWS', () => {
    expect(() => {
      getDataConnectionDisplayName(createDataConnection({} as DataConnectionType));
    }).toThrow('Invalid data connection type');
  });
});

describe('getDataConnectionDescription', () => {
  it('should return empty string when data connection is not AWS', () => {
    expect(getDataConnectionDescription(createDataConnection({} as DataConnectionType))).toBe('');
  });

  it('should return data connection description when data connection is AWS', () => {
    dataConnection.data.metadata.annotations = { 'openshift.io/description': 'description' };
    const result = getDataConnectionDescription(createDataConnection(DataConnectionType.AWS));
    expect(result).toBe('description');
  });
});

describe('getDataConnectionType', () => {
  it('should return connection type when data connection is AWS', () => {
    const result = getDataConnectionType(createDataConnection(DataConnectionType.AWS));
    expect(result).not.toBe(null);
  });

  it('should return error when data connection is not AWS', () => {
    expect(() => {
      getDataConnectionType(createDataConnection({} as DataConnectionType));
    }).toThrow('Invalid data connection type');
  });
});

describe('deleteDataConnection', () => {
  it('should return Success when data connection is AWS', async () => {
    const mockK8sStatus = mock200Status({});
    deletesecretMock.mockResolvedValue(mockK8sStatus);
    const result = await deleteDataConnection(createDataConnection(DataConnectionType.AWS));
    expect(result.status).toBe('Success');
  });

  it('should return Failure when data connection is AWS', async () => {
    const mockK8sStatus = mock404Error({});
    deletesecretMock.mockResolvedValue(mockK8sStatus);
    const result = await deleteDataConnection(createDataConnection(DataConnectionType.AWS));
    expect(result.status).toBe('Failure');
  });

  it('should return error when data connection is not AWS', () => {
    expect(() => {
      deleteDataConnection(createDataConnection({} as DataConnectionType));
    }).toThrow('Invalid data connection type');
  });
});

describe('convertAWSSecretData', () => {
  it('should return converted/decoded secret data', () => {
    const result = convertAWSSecretData(createDataConnection(DataConnectionType.AWS));
    expect(result).toEqual([
      { key: 'Name', value: 'test-secret' },
      { key: 'AWS_ACCESS_KEY_ID', value: 'µë-' },
      { key: 'AWS_SECRET_ACCESS_KEY', value: 'µë-' },
      { key: 'AWS_S3_ENDPOINT', value: 'zwi¢)í' },
      { key: 'AWS_DEFAULT_REGION', value: '­è"¢' },
      { key: 'AWS_S3_BUCKET', value: 'nç$z' },
    ]);
  });

  it('should return empty string', () => {
    dataConnection.data.metadata.name = '';
    dataConnection.data.data = {
      [AwsKeys.NAME]: '',
      AWS_ACCESS_KEY_ID: '',
      AWS_DEFAULT_REGION: '',
      AWS_S3_BUCKET: '',
      AWS_S3_ENDPOINT: '',
      AWS_SECRET_ACCESS_KEY: '',
    };
    const result = convertAWSSecretData(dataConnection);
    expect(result).toStrictEqual([
      { key: 'Name', value: '' },
      { key: 'AWS_ACCESS_KEY_ID', value: '' },
      { key: 'AWS_SECRET_ACCESS_KEY', value: '' },
      { key: 'AWS_S3_ENDPOINT', value: '' },
      { key: 'AWS_DEFAULT_REGION', value: '' },
      { key: 'AWS_S3_BUCKET', value: '' },
    ]);
  });
});
