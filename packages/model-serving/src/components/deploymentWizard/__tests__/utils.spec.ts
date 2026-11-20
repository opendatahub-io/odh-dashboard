import { MetadataAnnotation, type SecretKind } from '@odh-dashboard/k8s-core';
import { mockConnectionTypeConfigMapObj } from '@odh-dashboard/k8s-core/__mocks__/mockConnectionType';
import type { SecretOps } from '@odh-dashboard/plugin-core';
import { ModelLocationType, type WizardFormData } from '../../../shared/types/form-data';
import type { DeployExtension } from '../deploying/useDeployMethod';
import { deployModel } from '../utils';

describe('deployModel', () => {
  it.each([false, true])(
    'should validate an unnamed, unsaved S3 connection before the deployment dry run (connection rejected=%s)',
    async (rejectConnection) => {
      const wizardState = {
        project: { projectName: 'test-project' },
        modelLocationData: {
          data: {
            type: ModelLocationType.NEW,
            connectionTypeObject: mockConnectionTypeConfigMapObj({
              name: 's3',
              fields: [
                'AWS_ACCESS_KEY_ID',
                'AWS_SECRET_ACCESS_KEY',
                'AWS_S3_ENDPOINT',
                'AWS_S3_BUCKET',
              ].map((envVar) => ({ type: 'short-text', name: envVar, envVar, properties: {} })),
            }),
            fieldValues: {
              AWS_ACCESS_KEY_ID: 'test-access-key',
              AWS_SECRET_ACCESS_KEY: 'test-secret-key',
              AWS_S3_ENDPOINT: 'https://s3.example.com',
              AWS_S3_BUCKET: 'models',
            },
            additionalFields: { modelPath: 'my-model' },
          },
        },
        createConnectionData: { data: { saveConnection: false } },
        huggingFaceApiKey: { data: { token: '' } },
      } as unknown as WizardFormData['state'];
      const resource = {
        apiVersion: 'serving.kserve.io/v1alpha2',
        kind: 'LLMInferenceService',
        metadata: { name: 's3-model', namespace: 'test-project', annotations: {} },
        spec: { model: { uri: '' } },
      };
      const secretOps: jest.Mocked<SecretOps> = {
        createSecret: jest.fn(async (secret) => {
          if (rejectConnection) {
            throw new Error('Connection validation failed');
          }
          return secret;
        }),
        getSecret: jest.fn(
          async (_namespace, name) =>
            ({
              apiVersion: 'v1',
              kind: 'Secret',
              metadata: { name, namespace: 'test-project' },
              data: {},
            } as SecretKind),
        ),
        deleteSecret: jest.fn(),
        patchSecretWithOwnerReference: jest.fn(),
        patchSecretWithProtocolAnnotation: jest.fn(),
      };
      const deploy = jest.fn(async (...args: Parameters<DeployExtension['deploy']>) => ({
        modelServingPlatformId: 'llmd-serving',
        model: args[4] ?? resource,
      }));
      const result = deployModel(
        wizardState,
        {},
        secretOps,
        undefined,
        { platform: 'llmd-serving', isActive: true, priority: 0, deploy },
        undefined,
        resource,
      );

      if (rejectConnection) {
        await expect(result).rejects.toThrow('Connection validation failed');
        expect(deploy).not.toHaveBeenCalled();
        expect(secretOps.createSecret).toHaveBeenCalledTimes(1);
        return;
      }

      await result;

      const [connectionDryRun, connectionSubmission] = secretOps.createSecret.mock.calls;
      const [dryRun, submission] = deploy.mock.calls;
      expect(connectionDryRun[1]).toEqual({ dryRun: true });
      expect(connectionDryRun[0].metadata.annotations?.['opendatahub.io/connection-hidden']).toBe(
        'true',
      );
      expect(connectionDryRun[0].metadata.name).toEqual(expect.any(String));
      expect(dryRun[7]).toBe(true);
      expect(dryRun[8]).toBe(connectionDryRun[0].metadata.name);
      expect(dryRun[4]?.metadata.annotations?.[MetadataAnnotation.ConnectionName]).toBeUndefined();
      expect(submission[7]).toBe(false);
      expect(submission[8]).toBe(connectionSubmission[0].metadata.name);
      expect(submission[4]?.metadata.annotations?.[MetadataAnnotation.ConnectionName]).toBe(
        connectionSubmission[0].metadata.name,
      );
      expect(resource.metadata.annotations).toEqual({});
    },
  );

  it.each([undefined, 'yaml-connection'])(
    'should preserve a submitted connection separately during dry-run preparation: %s',
    async (connectionName) => {
      const wizardState = {
        project: { projectName: 'test-project' },
        modelLocationData: { data: undefined },
        createConnectionData: { data: {} },
        huggingFaceApiKey: { data: { token: '' } },
      } as unknown as WizardFormData['state'];
      const annotations: Record<string, string> = connectionName
        ? { [MetadataAnnotation.ConnectionName]: connectionName }
        : {};
      const resource = {
        apiVersion: 'serving.kserve.io/v1alpha2',
        kind: 'LLMInferenceService',
        metadata: {
          name: 'yaml-model',
          namespace: 'test-project',
          annotations,
        },
        spec: { model: { uri: connectionName ? '' : 'hf://org/model' } },
      };
      const original = structuredClone(resource);
      const secretOps: jest.Mocked<SecretOps> = {
        createSecret: jest.fn(),
        getSecret: jest.fn(),
        deleteSecret: jest.fn(),
        patchSecretWithOwnerReference: jest.fn(),
        patchSecretWithProtocolAnnotation: jest.fn(),
      };
      const deploy = jest.fn(async (...args: Parameters<DeployExtension['deploy']>) => {
        const model = args[4];
        if (!model) {
          throw new Error('Expected the submitted model resource');
        }
        return { modelServingPlatformId: 'llmd-serving', model };
      });

      await deployModel(
        wizardState,
        {},
        secretOps,
        undefined,
        { platform: 'llmd-serving', isActive: true, priority: 0, deploy },
        undefined,
        resource,
      );

      expect(deploy).toHaveBeenCalledTimes(2);
      const [dryRun, submission] = deploy.mock.calls;
      expect(dryRun[7]).toBe(true);
      expect(dryRun[8]).toBe(connectionName);
      expect(dryRun[4]?.metadata.annotations?.[MetadataAnnotation.ConnectionName]).toBeUndefined();
      expect(submission[7]).toBe(false);
      expect(submission[4]).toEqual(original);
      expect(resource).toEqual(original);
      expect(secretOps.createSecret).not.toHaveBeenCalled();
      expect(secretOps.getSecret).not.toHaveBeenCalled();
    },
  );
});
