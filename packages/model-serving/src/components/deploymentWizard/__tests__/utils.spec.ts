import { MetadataAnnotation } from '@odh-dashboard/k8s-core';
import type { SecretOps } from '@odh-dashboard/plugin-core';
import type { WizardFormData } from '../../../shared/types/form-data';
import type { DeployExtension } from '../deploying/useDeployMethod';
import { deployModel } from '../utils';

describe('deployModel', () => {
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
