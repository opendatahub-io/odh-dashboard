import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import {
  generateRole,
  setUpTokenAuth,
  createServiceAccountIfMissing,
  createRoleIfMissing,
  createRoleBindingIfMissing,
  getTokenNames,
  type TokenAuthEntry,
} from '../auth';

jest.mock('@odh-dashboard/internal/api/k8s/secrets', () => ({
  assembleSecretSA: jest.fn(
    (displayName: string, saName: string, ns: string, k8sName?: string) => ({
      metadata: { name: k8sName ?? `${displayName}-${saName}`, namespace: ns },
    }),
  ),
  createSecret: jest.fn((s: unknown) => Promise.resolve(s)),
  replaceSecret: jest.fn((s: unknown) => Promise.resolve(s)),
  deleteSecret: jest.fn(() => Promise.resolve({})),
}));

jest.mock('@odh-dashboard/internal/api/k8s/serviceAccounts', () => ({
  assembleServiceAccount: jest.fn((name: string, ns: string) => ({
    metadata: { name, namespace: ns },
  })),
  createServiceAccount: jest.fn((sa: unknown) => Promise.resolve(sa)),
  getServiceAccount: jest.fn(() => Promise.reject(new Error('not mocked'))),
}));

jest.mock('@odh-dashboard/internal/api/k8s/roles', () => ({
  getRole: jest.fn(() => Promise.reject(new Error('not mocked'))),
  createRole: jest.fn((r: unknown) => Promise.resolve(r)),
}));

jest.mock('@odh-dashboard/internal/api/k8s/roleBindings', () => ({
  generateRoleBindingServiceAccount: jest.fn(
    (name: string, _saName: string, _ref: unknown, ns: string) => ({
      metadata: { name, namespace: ns },
    }),
  ),
  getRoleBinding: jest.fn(() => Promise.reject(new Error('not mocked'))),
  createRoleBinding: jest.fn((rb: unknown) => Promise.resolve(rb)),
}));

jest.mock('@odh-dashboard/internal/api/k8sUtils', () => ({
  addOwnerReference: jest.fn((resource: unknown) => resource),
}));

jest.mock('@odh-dashboard/internal/api/errorUtils', () => ({
  getGenericErrorCode: jest.fn((error: unknown) => {
    const e = error as { statusObject?: { code?: number } };
    return e.statusObject?.code;
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const secretsMock = require('@odh-dashboard/internal/api/k8s/secrets');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const serviceAccountsMock = require('@odh-dashboard/internal/api/k8s/serviceAccounts');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const rolesMock = require('@odh-dashboard/internal/api/k8s/roles');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const roleBindingsMock = require('@odh-dashboard/internal/api/k8s/roleBindings');

const make404 = () => ({ statusObject: { code: 404, status: 'Failure', message: 'not found' } });

const mockOwner: K8sResourceCommon = {
  apiVersion: 'serving.kserve.io/v1beta1',
  kind: 'InferenceService',
  metadata: { name: 'test-model', namespace: 'test-ns', uid: 'test-uid' },
};

describe('getTokenNames', () => {
  it('should return correct names from resource name', () => {
    const result = getTokenNames('my-model', 'test-ns');
    expect(result).toEqual({
      serviceAccountName: 'my-model-sa',
      roleName: 'my-model-view-role',
      roleBindingName: 'my-model-view',
    });
  });

  it('should use namespace-based name when resource name is empty', () => {
    const result = getTokenNames('', 'test-ns');
    expect(result).toEqual({
      serviceAccountName: 'model-server-test-ns-sa',
      roleName: 'model-server-test-ns-view-role',
      roleBindingName: 'model-server-test-ns-view',
    });
  });
});

describe('generateRole', () => {
  it('should generate a role for inferenceservices', () => {
    const role = generateRole('test-role', 'test-model', 'test-ns', 'inferenceservices');
    expect(role.rules?.[0].resources).toEqual(['inferenceservices']);
    expect(role.rules?.[0].resourceNames).toEqual(['test-model']);
    expect(role.rules?.[0].verbs).toEqual(['get']);
    expect(role.rules?.[0].apiGroups).toEqual(['serving.kserve.io']);
    expect(role.metadata.name).toBe('test-role');
    expect(role.metadata.namespace).toBe('test-ns');
  });

  it('should generate a role for llminferenceservices', () => {
    const role = generateRole('test-role', 'test-model', 'test-ns', 'llminferenceservices');
    expect(role.rules?.[0].resources).toEqual(['llminferenceservices']);
  });
});

describe('createServiceAccountIfMissing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return existing service account if found', async () => {
    const existingSA = { metadata: { name: 'test-sa' } };
    serviceAccountsMock.getServiceAccount.mockResolvedValue(existingSA);
    const sa = { metadata: { name: 'test-sa' } } as never;

    const result = await createServiceAccountIfMissing(sa, 'test-ns');
    expect(result).toBe(existingSA);
    expect(serviceAccountsMock.createServiceAccount).not.toHaveBeenCalled();
  });

  it('should create service account on 404', async () => {
    serviceAccountsMock.getServiceAccount.mockRejectedValue(make404());
    const sa = { metadata: { name: 'test-sa' } } as never;
    const created = { metadata: { name: 'test-sa', uid: 'new-uid' } };
    serviceAccountsMock.createServiceAccount.mockResolvedValue(created);

    const result = await createServiceAccountIfMissing(sa, 'test-ns');
    expect(result).toBe(created);
  });

  it('should reject on non-404 errors', async () => {
    const error = new Error('forbidden');
    serviceAccountsMock.getServiceAccount.mockRejectedValue(error);
    const sa = { metadata: { name: 'test-sa' } } as never;

    await expect(createServiceAccountIfMissing(sa, 'test-ns')).rejects.toBe(error);
  });
});

describe('createRoleIfMissing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return existing role if found', async () => {
    const existing = { metadata: { name: 'test-role' } };
    rolesMock.getRole.mockResolvedValue(existing);
    const role = { metadata: { name: 'test-role' } } as never;

    const result = await createRoleIfMissing(role, 'test-ns');
    expect(result).toBe(existing);
  });

  it('should create role on 404', async () => {
    rolesMock.getRole.mockRejectedValue(make404());
    const role = { metadata: { name: 'test-role' } } as never;
    const created = { metadata: { name: 'test-role', uid: 'new-uid' } };
    rolesMock.createRole.mockResolvedValue(created);

    const result = await createRoleIfMissing(role, 'test-ns');
    expect(result).toBe(created);
  });
});

describe('createRoleBindingIfMissing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return existing role binding if found', async () => {
    const existing = { metadata: { name: 'test-rb' } };
    roleBindingsMock.getRoleBinding.mockResolvedValue(existing);
    const rb = { metadata: { name: 'test-rb' } } as never;

    const result = await createRoleBindingIfMissing(rb, 'test-ns');
    expect(result).toBe(existing);
  });

  it('should create role binding on 404', async () => {
    roleBindingsMock.getRoleBinding.mockRejectedValue(make404());
    const rb = { metadata: { name: 'test-rb' } } as never;
    const created = { metadata: { name: 'test-rb', uid: 'new-uid' } };
    roleBindingsMock.createRoleBinding.mockResolvedValue(created);

    const result = await createRoleBindingIfMissing(rb, 'test-ns');
    expect(result).toBe(created);
  });

  it('should resolve on 404 during dryRun create', async () => {
    roleBindingsMock.getRoleBinding.mockRejectedValue(make404());
    const rb = { metadata: { name: 'test-rb' } } as never;
    roleBindingsMock.createRoleBinding.mockRejectedValue(make404());

    const result = await createRoleBindingIfMissing(rb, 'test-ns', { dryRun: true });
    expect(result).toBe(rb);
  });
});

describe('setUpTokenAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    serviceAccountsMock.getServiceAccount.mockRejectedValue(make404());
    serviceAccountsMock.createServiceAccount.mockImplementation((sa: unknown) =>
      Promise.resolve(sa),
    );
    rolesMock.getRole.mockRejectedValue(make404());
    rolesMock.createRole.mockImplementation((r: unknown) => Promise.resolve(r));
    roleBindingsMock.getRoleBinding.mockRejectedValue(make404());
    roleBindingsMock.createRoleBinding.mockImplementation((rb: unknown) => Promise.resolve(rb));
  });

  it('should create auth resources when createTokenAuthResources is true', async () => {
    await setUpTokenAuth([], 'test-model', 'test-ns', true, mockOwner, 'inferenceservices');

    expect(serviceAccountsMock.createServiceAccount).toHaveBeenCalled();
    expect(rolesMock.createRole).toHaveBeenCalled();
    expect(roleBindingsMock.createRoleBinding).toHaveBeenCalled();
  });

  it('should skip auth resource creation when createTokenAuthResources is false', async () => {
    await setUpTokenAuth([], 'test-model', 'test-ns', false, mockOwner, 'inferenceservices');

    expect(serviceAccountsMock.getServiceAccount).not.toHaveBeenCalled();
    expect(rolesMock.getRole).not.toHaveBeenCalled();
    expect(roleBindingsMock.getRoleBinding).not.toHaveBeenCalled();
  });

  it('should work with llminferenceservices resource type', async () => {
    await setUpTokenAuth([], 'test-model', 'test-ns', true, mockOwner, 'llminferenceservices');

    expect(rolesMock.createRole).toHaveBeenCalled();
  });

  it('should create secrets for new tokens', async () => {
    const tokens: TokenAuthEntry[] = [{ displayName: 'token-1', uuid: 'uuid-1' }];

    await setUpTokenAuth(tokens, 'test-model', 'test-ns', false, mockOwner, 'inferenceservices');

    expect(secretsMock.createSecret).toHaveBeenCalled();
  });

  it('should replace secrets for existing tokens', async () => {
    const tokens: TokenAuthEntry[] = [
      { displayName: 'token-1', k8sName: 'existing-secret', uuid: 'uuid-1' },
    ];

    await setUpTokenAuth(tokens, 'test-model', 'test-ns', false, mockOwner, 'inferenceservices');

    expect(secretsMock.replaceSecret).toHaveBeenCalled();
  });

  it('should delete removed secrets', async () => {
    const existingSecrets = [{ metadata: { name: 'old-secret' } }] as never[];

    await setUpTokenAuth(
      [],
      'test-model',
      'test-ns',
      false,
      mockOwner,
      'inferenceservices',
      existingSecrets,
    );

    expect(secretsMock.deleteSecret).toHaveBeenCalledWith('test-ns', 'old-secret', undefined);
  });
});
