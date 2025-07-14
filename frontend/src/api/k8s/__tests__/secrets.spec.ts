import {
  K8sStatus,
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResource,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { mockK8sResourceList } from '#~/__mocks__/mockK8sResourceList';
import { mock200Status, mock404Error } from '#~/__mocks__/mockK8sStatus';
import { mockSecretK8sResource } from '#~/__mocks__/mockSecretK8sResource';
import {
  assembleISSecretBody,
  assembleSecret,
  assembleSecretISStorage,
  assembleSecretSA,
  createSecret,
  deleteSecret,
  getSecret,
  getSecretsByLabel,
  replaceSecret,
} from '#~/api/k8s/secrets';
import { SecretModel } from '#~/api/models/k8s';
import { SecretKind } from '#~/k8sTypes';
import { genRandomChars } from '#~/utilities/string';

jest.mock('#~/utilities/string', () => ({
  genRandomChars: jest.fn(),
}));

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sGetResource: jest.fn(),
  k8sListResource: jest.fn(),
  k8sCreateResource: jest.fn(),
  k8sUpdateResource: jest.fn(),
  k8sDeleteResource: jest.fn(),
}));

const genRandomCharsMock = jest.mocked(genRandomChars);
const k8sGetResourceMock = jest.mocked(k8sGetResource<SecretKind>);
const k8sListResourceMock = jest.mocked(k8sListResource<SecretKind>);
const k8sCreateResourceMock = jest.mocked(k8sCreateResource<SecretKind>);
const k8sUpdateResourceMock = jest.mocked(k8sUpdateResource<SecretKind>);
const k8sDeleteResourceMock = jest.mocked(k8sDeleteResource<SecretKind, K8sStatus>);

const data = {
  Name: '',
  AWS_ACCESS_KEY_ID: 'c2RzZA==',
  AWS_DEFAULT_REGION: 'us-east-1',
  AWS_S3_BUCKET: 's3Bucket',
  AWS_S3_ENDPOINT: 'http://aws.com',
  AWS_SECRET_ACCESS_KEY: 'aHR0cHM6Ly9zMy5hbWF6b25hd3MuY29tLw==',
};

const assembleSecretResult = {
  apiVersion: 'v1',
  kind: 'Secret',
  metadata: {
    name: 'aws-connection-',
    namespace: 'secret',
    annotations: {
      'openshift.io/display-name': '',
      'opendatahub.io/connection-type': 's3',
    },
    labels: {
      'opendatahub.io/dashboard': 'true',
      'opendatahub.io/managed': 'true',
    },
  },
  stringData: {
    AWS_ACCESS_KEY_ID: 'c2RzZA==',
    AWS_DEFAULT_REGION: 'us-east-1',
    AWS_S3_BUCKET: 's3Bucket',
    AWS_S3_ENDPOINT: 'http://aws.com',
    AWS_SECRET_ACCESS_KEY: 'aHR0cHM6Ly9zMy5hbWF6b25hd3MuY29tLw==',
  },
};

const assembleSecretSAResult = {
  apiVersion: 'v1',
  kind: 'Secret',
  metadata: {
    annotations: {
      'kubernetes.io/service-account.name': 'serviceAccount',
      'openshift.io/display-name': 'secret',
    },
    labels: { 'opendatahub.io/dashboard': 'true' },
    name: 'secret-serviceAccount',
    namespace: 'namespace',
  },
  type: 'kubernetes.io/service-account-token',
};

describe('assembleSecret', () => {
  it('should return assemble secrets without secretName when type is aws', () => {
    const result = assembleSecret('secret', data, 'aws');
    expect(result).toStrictEqual(assembleSecretResult);
  });

  it('should return assemble secrets  with secretName when type is aws', () => {
    const result = assembleSecret('secret', data, 'aws', 'secret');
    expect(result).toStrictEqual({
      ...assembleSecretResult,
      metadata: { ...assembleSecretResult.metadata, name: 'secret' },
    });
  });

  it('should return assemble secrets when type is generic', () => {
    const result = assembleSecret('secret', data, 'generic', 'secret');
    expect(result).toStrictEqual({
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        annotations: {},
        labels: { 'opendatahub.io/dashboard': 'true' },
        name: 'secret',
        namespace: 'secret',
      },
      stringData: data,
    });
  });

  it('should return assemble secrets when type is not present', () => {
    const result = assembleSecret('secret', data);
    expect(result).toStrictEqual({
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        annotations: {},
        labels: { 'opendatahub.io/dashboard': 'true' },
        name: 'secret-undefined',
        namespace: 'secret',
      },
      stringData: data,
    });
  });
});

describe('assembleISSecretBody', () => {
  it('should return assemble secret body', () => {
    genRandomCharsMock.mockReturnValue('123');
    const result = assembleISSecretBody(data);
    expect(result).toStrictEqual([
      {
        'secret-123': JSON.stringify(data),
      },
      'secret-123',
    ]);
  });
});

describe('assembleSecretISStorage', () => {
  it('should return assemble secret storage', () => {
    genRandomCharsMock.mockReturnValue('123');
    const result = assembleSecretISStorage('namespace', data);
    expect(result).toStrictEqual([
      {
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: {
          labels: { 'opendatahub.io/dashboard': 'true' },
          name: 'storage-config',
          namespace: 'namespace',
        },
        stringData: {
          'secret-123': JSON.stringify(data),
        },
      },
      'secret-123',
    ]);
  });
});

describe('assembleSecretSA', () => {
  it('should return assemble secret service account when editName is not present', () => {
    const result = assembleSecretSA('secret', 'serviceAccount', 'namespace');
    expect(result).toStrictEqual(assembleSecretSAResult);
  });

  it('should return assemble secret service account when editName is present', () => {
    const result = assembleSecretSA('secret', 'serviceAccount', 'namespace', 'tokenEditName');
    expect(result).toStrictEqual({
      ...assembleSecretSAResult,
      metadata: { ...assembleSecretSAResult.metadata, name: 'tokenEditName' },
    });
  });
});

describe('getSecret', () => {
  it('should fetch return secret', async () => {
    const secretMock = mockSecretK8sResource({});
    k8sGetResourceMock.mockResolvedValue(secretMock);
    const result = await getSecret('projectName', 'secretName');
    expect(k8sGetResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: SecretModel,
      queryOptions: { name: 'secretName', ns: 'projectName', queryParams: {} },
    });
    expect(k8sGetResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(secretMock);
  });

  it('should handle errors and rethrow', async () => {
    k8sGetResourceMock.mockRejectedValue(new Error('error1'));
    await expect(getSecret('projectName', 'secretName')).rejects.toThrow('error1');
    expect(k8sGetResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sGetResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: SecretModel,
      queryOptions: { name: 'secretName', ns: 'projectName', queryParams: {} },
    });
  });
});

describe('getSecretsByLabel', () => {
  it('should return secret by label', async () => {
    const secretMock = mockK8sResourceList([mockSecretK8sResource({})]);
    k8sListResourceMock.mockResolvedValue(secretMock);
    const result = await getSecretsByLabel('label', 'secretName');
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: SecretModel,
      queryOptions: { ns: 'secretName', queryParams: { labelSelector: 'label' } },
    });
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(secretMock.items);
  });

  it('should handle errors and rethrow', async () => {
    k8sListResourceMock.mockRejectedValue(new Error('error1'));
    await expect(getSecretsByLabel('label', 'secretName')).rejects.toThrow('error1');
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: SecretModel,
      queryOptions: { ns: 'secretName', queryParams: { labelSelector: 'label' } },
    });
  });
});

describe('createSecret', () => {
  it('should create secret ', async () => {
    const secretMock = mockSecretK8sResource({});
    k8sCreateResourceMock.mockResolvedValue(secretMock);
    const result = await createSecret(assembleSecret('secret', data, 'aws'));
    expect(k8sCreateResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: SecretModel,
      queryOptions: { queryParams: {} },
      resource: {
        ...assembleSecretResult,
        stringData: { ...assembleSecretResult.stringData, type: 's3' },
      },
    });
    expect(k8sCreateResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(secretMock);
  });

  it('should handle errors and rethrow', async () => {
    k8sCreateResourceMock.mockRejectedValue(new Error('error1'));
    await expect(createSecret(assembleSecret('secret', data, 'aws'))).rejects.toThrow('error1');
    expect(k8sCreateResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: SecretModel,
      queryOptions: { queryParams: {} },
      resource: {
        ...assembleSecretResult,
        stringData: { ...assembleSecretResult.stringData, type: 's3' },
      },
    });
    expect(k8sCreateResourceMock).toHaveBeenCalledTimes(1);
  });
});

describe('replaceSecret', () => {
  it('should replace the secret ', async () => {
    const secretMock = mockSecretK8sResource({});
    k8sUpdateResourceMock.mockResolvedValue(secretMock);
    const result = await replaceSecret(assembleSecret('secret', data, 'aws'));
    expect(k8sUpdateResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: SecretModel,
      queryOptions: { queryParams: {} },
      resource: {
        ...assembleSecretResult,
        stringData: { ...assembleSecretResult.stringData, type: 's3' },
      },
    });
    expect(k8sUpdateResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(secretMock);
  });

  it('should handle errors and rethrow', async () => {
    k8sUpdateResourceMock.mockRejectedValue(new Error('error1'));
    await expect(replaceSecret(assembleSecret('secret', data, 'aws'))).rejects.toThrow('error1');
    expect(k8sUpdateResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: SecretModel,
      queryOptions: { queryParams: {} },
      resource: {
        ...assembleSecretResult,
        stringData: { ...assembleSecretResult.stringData, type: 's3' },
      },
    });
    expect(k8sUpdateResourceMock).toHaveBeenCalledTimes(1);
  });
});

describe('deleteSecret', () => {
  it('should return status as Success', async () => {
    const mockK8sStatus = mock200Status({});
    k8sDeleteResourceMock.mockResolvedValue(mockK8sStatus);
    const result = await deleteSecret('projectName', 'secretName');
    expect(k8sDeleteResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: SecretModel,
      queryOptions: { name: 'secretName', ns: 'projectName', queryParams: {} },
    });
    expect(k8sDeleteResourceMock).toHaveBeenCalledTimes(1);
    expect(result.status).toStrictEqual('Success');
  });

  it('should return status as Failure', async () => {
    const mockK8sStatus = mock404Error({});
    k8sDeleteResourceMock.mockResolvedValue(mockK8sStatus);
    const result = await deleteSecret('projectName', 'secretName');
    expect(k8sDeleteResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: SecretModel,
      queryOptions: { name: 'secretName', ns: 'projectName', queryParams: {} },
    });
    expect(k8sDeleteResourceMock).toHaveBeenCalledTimes(1);
    expect(result.status).toStrictEqual('Failure');
  });

  it('should handle errors and rethrow', async () => {
    k8sDeleteResourceMock.mockRejectedValue(new Error('error1'));
    await expect(deleteSecret('projectName', 'secretName')).rejects.toThrow('error1');
    expect(k8sDeleteResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sDeleteResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: SecretModel,
      queryOptions: { name: 'secretName', ns: 'projectName', queryParams: {} },
    });
  });
});
