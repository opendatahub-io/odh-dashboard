import type { SecretOps } from '@odh-dashboard/plugin-core';
import { handleConnectionCreation } from '../../../concepts/connectionUtils';
import { deployModel } from '../utils';
import type { DeployExtension } from '../deploying/useDeployMethod';
import type { WizardFormData } from '../../../shared/types/form-data';
import type { Deployment } from '../../../../extension-points';

jest.mock('@odh-dashboard/plugin-core');
jest.mock('../../../concepts/connectionUtils', () => ({
  handleConnectionCreation: jest.fn(() => Promise.resolve(undefined)),
  handleSecretOwnerReferencePatch: jest.fn(() => Promise.resolve()),
}));

const wizardState = {
  project: { projectName: 'test-project' },
  createConnectionData: { data: undefined },
  modelLocationData: { data: undefined, selectedConnection: undefined },
  huggingFaceApiKey: { data: undefined },
} as unknown as WizardFormData['state'];

const model = {
  apiVersion: 'serving.kserve.io/v1alpha2',
  kind: 'LLMInferenceService',
  metadata: { name: 'my-model', namespace: 'test-project', annotations: {} },
};

// A force update follows a 409 on an edit: the deployment exists.
const existingDeployment = {
  modelServingPlatformId: 'llmd-serving',
  model,
} as unknown as Deployment;

const deployMethod = (deploy: jest.Mock): DeployExtension =>
  ({ platform: 'llmd-serving', deploy } as unknown as DeployExtension);

describe('deployModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should dry-run a force update, with the overwrite, before writing anything', async () => {
    const deploy = jest.fn<Promise<{ model: typeof model }>, unknown[]>(() =>
      Promise.resolve({ model }),
    );
    await deployModel(
      wizardState,
      {},
      {} as SecretOps,
      undefined,
      deployMethod(deploy),
      existingDeployment,
      model,
      undefined,
      undefined,
      true,
    );
    expect(deploy).toHaveBeenCalledTimes(2);
    // The dry run gets the existing deployment, so it patches as the real run does.
    expect(deploy.mock.calls[0][3]).toBe(existingDeployment);
    // [dryRun, connectionSecretName, overwrite]
    expect(deploy.mock.calls[0].slice(7, 10)).toEqual([true, undefined, true]);
    expect(deploy.mock.calls[1].slice(7, 10)).toEqual([false, undefined, true]);
  });

  it('should write nothing when the force update dry run is refused', async () => {
    const deploy = jest.fn<Promise<never>, unknown[]>(() =>
      Promise.reject(new Error('You do not have permission to create authentication tokens')),
    );
    await expect(
      deployModel(
        wizardState,
        {},
        {} as SecretOps,
        undefined,
        deployMethod(deploy),
        existingDeployment,
        model,
        undefined,
        undefined,
        true,
      ),
    ).rejects.toThrow('permission');
    expect(deploy).toHaveBeenCalledTimes(1);
    expect(deploy.mock.calls[0][7]).toBe(true);
    // Only the connection dry run ran; no real connection Secret was created.
    expect(jest.mocked(handleConnectionCreation).mock.calls.every((call) => call[5])).toBe(true);
  });
});
