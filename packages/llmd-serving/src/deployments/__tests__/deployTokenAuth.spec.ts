import type { WizardFormData } from '@odh-dashboard/model-serving/shared/types/form-data';
import { setUpTokenAuth } from '@odh-dashboard/model-serving/concepts/auth';
import { mockLLMInferenceServiceK8sResource } from '../../__mocks__/mockLLMInferenceServiceK8sResource';
import {
  createLLMInferenceService,
  updateLLMInferenceService,
} from '../../api/LLMInferenceService';
import { deployLLMdDeployment, keepAuthWithoutTokenPermission } from '../deploy';

jest.mock('@odh-dashboard/model-serving/concepts/auth', () => ({
  ...jest.requireActual('@odh-dashboard/model-serving/concepts/auth'),
  setUpTokenAuth: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../api/LLMInferenceService', () => ({
  createLLMInferenceService: jest.fn(),
  patchLLMInferenceService: jest.fn(),
  updateLLMInferenceService: jest.fn(),
}));
jest.mock('../../hfTokenSecret', () => ({
  applyHfTokenServiceAccount: (model: unknown) => model,
  resolveHfTokenSecretName: jest.fn(() => Promise.resolve(undefined)),
  resolveHfTokenServiceAccountName: jest.fn(() => Promise.resolve(undefined)),
}));

const model = mockLLMInferenceServiceK8sResource({ name: 'my-model', namespace: 'test-project' });

const EXISTING_TOKEN = { uuid: 'a', displayName: 'existing', k8sName: 'existing-my-model-sa' };
const NEW_TOKEN = { uuid: 'b', displayName: 'default-name' };

const wizardData = (
  canCreateRoleBindings: boolean,
  canManageTokenAuth: boolean | undefined,
  tokens: { uuid: string; displayName: string; k8sName?: string }[] = [EXISTING_TOKEN],
) =>
  ({
    k8sNameDesc: { data: { k8sName: { value: 'my-model' } } },
    huggingFaceApiKey: { data: undefined },
    tokenAuthentication: { data: tokens },
    canCreateRoleBindings,
    ...(canManageTokenAuth !== undefined && { canManageTokenAuth }),
  } as unknown as WizardFormData['state']);

describe('deployLLMdDeployment token authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(createLLMInferenceService).mockResolvedValue(model);
  });

  it.each([
    [true, true, true],
    // The host's token permission does not skip setup: Kubernetes decides.
    [true, false, true],
    [false, true, false],
    // Wizard state from before canManageTokenAuth existed.
    [true, undefined, true],
  ])(
    'should set up tokens on an edit with RoleBinding create (RoleBindings %s, token auth %s)',
    async (canCreateRoleBindings, canManageTokenAuth, expected) => {
      jest.mocked(updateLLMInferenceService).mockResolvedValue(model);
      await deployLLMdDeployment(
        wizardData(canCreateRoleBindings, canManageTokenAuth),
        {},
        'test-project',
        { modelServingPlatformId: 'llmd-serving', model },
        model,
      );
      expect(jest.mocked(setUpTokenAuth).mock.calls.length > 0).toBe(expected);
    },
  );

  it('should keep auth on and set the default token up after a host token refusal', async () => {
    // Paulo's shape: no Role create, but the token ServiceAccount, Role and
    // RoleBinding already exist. Setup reuses them; Kubernetes decides.
    await deployLLMdDeployment(
      wizardData(true, false, [NEW_TOKEN]),
      {},
      'test-project',
      undefined,
      model,
    );
    const created = jest.mocked(createLLMInferenceService).mock.calls[0][0];
    expect(created.metadata.annotations?.['security.opendatahub.io/enable-auth']).not.toBe('false');
    expect(setUpTokenAuth).toHaveBeenCalledWith(
      [NEW_TOKEN],
      model.metadata.name,
      model.metadata.namespace,
      true,
      model,
      'llminferenceservices',
      undefined,
      { dryRun: undefined },
    );
  });

  it('should stop at the dry run when Kubernetes refuses the token setup', async () => {
    jest.mocked(setUpTokenAuth).mockRejectedValueOnce(new Error('roles is forbidden'));
    await expect(
      deployLLMdDeployment(
        wizardData(true, false, [NEW_TOKEN]),
        {},
        'test-project',
        undefined,
        model,
        undefined,
        undefined,
        true,
      ),
    ).rejects.toThrow('roles is forbidden');
    expect(createLLMInferenceService).toHaveBeenCalledWith(expect.anything(), { dryRun: true });
  });

  it('should set the default token up on a new deployment without RoleBinding create', async () => {
    // No permission check decides whether a new deployment requires auth.
    await deployLLMdDeployment(
      wizardData(false, undefined, [NEW_TOKEN]),
      {},
      'test-project',
      undefined,
      model,
    );
    const created = jest.mocked(createLLMInferenceService).mock.calls[0][0];
    expect(created.metadata.annotations?.['security.opendatahub.io/enable-auth']).not.toBe('false');
    expect(setUpTokenAuth).toHaveBeenCalled();
  });

  describe('keepAuthWithoutTokenPermission', () => {
    const withAuth = (value?: string) => {
      const m = mockLLMInferenceServiceK8sResource({ name: 'my-model', namespace: 'test-project' });
      const annotations = { ...m.metadata.annotations };
      delete annotations['security.opendatahub.io/enable-auth'];
      if (value !== undefined) {
        annotations['security.opendatahub.io/enable-auth'] = value;
      }
      return { ...m, metadata: { ...m.metadata, annotations } };
    };

    it("should keep an edited deployment's auth setting without token permission", () => {
      // The disabled field has no tokens, which would otherwise turn auth off.
      const saved = keepAuthWithoutTokenPermission(withAuth('false'), withAuth(), false);
      expect(saved.metadata.annotations?.['security.opendatahub.io/enable-auth']).toBeUndefined();
      const off = keepAuthWithoutTokenPermission(withAuth(), withAuth('false'), false);
      expect(off.metadata.annotations?.['security.opendatahub.io/enable-auth']).toBe('false');
    });

    it('should derive the setting from the tokens with permission or for a new deployment', () => {
      const derived = withAuth('false');
      expect(keepAuthWithoutTokenPermission(derived, withAuth(), true)).toBe(derived);
      expect(keepAuthWithoutTokenPermission(derived, undefined, false)).toBe(derived);
    });
  });
});
