import type { ConnectionTypeConfigMapObj, SecretKind } from '@odh-dashboard/k8s-core';
import type { SecretOps } from '@odh-dashboard/plugin-core/host-api';
import type { CreateConnectionData } from '../../components/deploymentWizard/fields/CreateConnectionInputFields';
import { ModelLocationType, type ModelLocationData } from '../../shared/types/form-data';
import { handleConnectionCreation } from '../connectionUtils';

const makeSecret = (name: string): SecretKind =>
  ({
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: { name, namespace: 'test-project' },
    data: {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

const makeConnectionType = (name: string): ConnectionTypeConfigMapObj =>
  ({
    apiVersion: 'v1',
    kind: 'ConfigMap',
    metadata: {
      name,
      annotations: {},
      labels: { 'opendatahub.io/connection-type': 'true' },
    },
    data: { category: [], fields: [] },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

const makeOps = (): jest.Mocked<SecretOps> =>
  ({
    createSecret: jest.fn((secret) => Promise.resolve(secret)),
    getSecret: jest.fn((_project: string, name: string) => Promise.resolve(makeSecret(name))),
    deleteSecret: jest.fn(() => Promise.resolve()),
    patchSecretWithOwnerReference: jest.fn(() => Promise.resolve()),
    patchSecretWithProtocolAnnotation: jest.fn(() => Promise.resolve()),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

const createConnectionData: CreateConnectionData = {
  saveConnection: false,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

describe('handleConnectionCreation', () => {
  let ops: jest.Mocked<SecretOps>;

  beforeEach(() => {
    jest.clearAllMocks();
    ops = makeOps();
  });

  it('should create a secret for a new connection', async () => {
    const modelLocationData: ModelLocationData = {
      type: ModelLocationType.NEW,
      connectionTypeObject: makeConnectionType('s3-v1'),
      fieldValues: { AWS_S3_BUCKET: 'my-bucket' },
      additionalFields: {},
    };

    const secret = await handleConnectionCreation(
      ops,
      createConnectionData,
      'test-project',
      modelLocationData,
    );

    expect(ops.createSecret).toHaveBeenCalledTimes(1);
    expect(secret).toBeDefined();
  });

  it('should create a secret for a location whose only field value is a URI', async () => {
    const modelLocationData: ModelLocationData = {
      type: ModelLocationType.PVC,
      fieldValues: { URI: 'pvc://my-claim/' },
      additionalFields: {},
    };

    await handleConnectionCreation(ops, createConnectionData, 'test-project', modelLocationData);

    expect(ops.createSecret).toHaveBeenCalledTimes(1);
  });

  it('should not create a secret when the location supplied no field values', async () => {
    // The location resolves its model through wizard field extensions instead of a connection, so
    // there is nothing to store -- the secret would have no data keys for the webhook to read.
    const modelLocationData: ModelLocationData = {
      type: ModelLocationType.NEW,
      fieldValues: {},
      additionalFields: {},
    };

    const secret = await handleConnectionCreation(
      ops,
      createConnectionData,
      'test-project',
      modelLocationData,
    );

    expect(secret).toBeUndefined();
    expect(ops.createSecret).not.toHaveBeenCalled();
  });

  it('should not create a secret during a dry run when the location supplied no field values', async () => {
    const modelLocationData: ModelLocationData = {
      type: ModelLocationType.NEW,
      fieldValues: {},
      additionalFields: {},
    };

    const secret = await handleConnectionCreation(
      ops,
      createConnectionData,
      'test-project',
      modelLocationData,
      undefined,
      true,
    );

    expect(secret).toBeUndefined();
    expect(ops.createSecret).not.toHaveBeenCalled();
  });

  it('should not create a secret when there is no model location at all', async () => {
    const secret = await handleConnectionCreation(ops, createConnectionData, 'test-project');

    expect(secret).toBeUndefined();
    expect(ops.createSecret).not.toHaveBeenCalled();
  });

  it('should not create a secret for an existing connection', async () => {
    const modelLocationData: ModelLocationData = {
      type: ModelLocationType.EXISTING,
      connection: 'my-connection',
      fieldValues: {},
      additionalFields: {},
    };

    const secret = await handleConnectionCreation(
      ops,
      createConnectionData,
      'test-project',
      modelLocationData,
    );

    expect(secret).toBeUndefined();
    expect(ops.createSecret).not.toHaveBeenCalled();
  });

  it('should still patch the protocol annotation on an existing connection', async () => {
    const modelLocationData: ModelLocationData = {
      type: ModelLocationType.EXISTING,
      connection: 'my-connection',
      fieldValues: {},
      additionalFields: {},
    };

    await handleConnectionCreation(ops, createConnectionData, 'test-project', modelLocationData);

    // Fired without being awaited, so let the promise chain settle before asserting.
    await new Promise(process.nextTick);
    expect(ops.getSecret).toHaveBeenCalledWith('test-project', 'my-connection');
    expect(ops.patchSecretWithProtocolAnnotation).toHaveBeenCalledWith(expect.anything(), 'uri');
  });
});
