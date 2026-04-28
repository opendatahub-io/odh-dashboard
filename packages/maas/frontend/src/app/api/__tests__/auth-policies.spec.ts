import * as modArchCore from 'mod-arch-core';
import type { CreatePolicyRequest, UpdatePolicyRequest } from '~/app/types/auth-policies';
import type { MaaSAuthPolicy, MaaSModelRefSummary } from '~/app/types/subscriptions';
import {
  createAuthPolicy,
  deleteAuthPolicy,
  getPolicyInfo,
  listAuthPolicies,
  updateAuthPolicy,
} from '~/app/api/auth-policies';

jest.mock('mod-arch-core', () => ({
  ...jest.requireActual('mod-arch-core'),
  handleRestFailures: jest.fn((p: Promise<unknown>) => p),
  restGET: jest.fn(),
  restCREATE: jest.fn(),
  restUPDATE: jest.fn(),
  restDELETE: jest.fn(),
}));

const mockRestGET = jest.mocked(modArchCore.restGET);
const mockRestCREATE = jest.mocked(modArchCore.restCREATE);
const mockRestUPDATE = jest.mocked(modArchCore.restUPDATE);
const mockRestDELETE = jest.mocked(modArchCore.restDELETE);
const mockHandleRestFailures = jest.mocked(modArchCore.handleRestFailures);

const validPolicy: MaaSAuthPolicy = {
  name: 'test-policy',
  namespace: 'maas-system',
  phase: 'Active',
  modelRefs: [{ name: 'granite-3-8b-instruct', namespace: 'maas-models' }],
  subjects: { groups: [{ name: 'premium-users' }] },
};

const validModelRefSummary: MaaSModelRefSummary = {
  name: 'granite-3-8b-instruct',
  namespace: 'maas-models',
  modelRef: { kind: 'LLMInferenceService', name: 'granite-3-8b-instruct' },
  phase: 'Ready',
};

describe('listAuthPolicies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleRestFailures.mockImplementation((p: Promise<unknown>) => p);
  });

  it('should resolve with policies and call all-policies endpoint', async () => {
    mockRestGET.mockResolvedValue({ data: [validPolicy] });

    const result = await listAuthPolicies()({} as never);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('test-policy');
    expect(mockRestGET).toHaveBeenCalledWith('', expect.stringContaining('/all-policies'), {}, {});
  });

  it('should throw when response is not a mod-arch wrapped list', async () => {
    mockRestGET.mockResolvedValue([validPolicy]);

    await expect(listAuthPolicies()({} as never)).rejects.toThrow('Invalid response format');
  });
});

describe('getPolicyInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleRestFailures.mockImplementation((p: Promise<unknown>) => p);
  });

  const wrappedInfo = {
    data: {
      policy: validPolicy,
      modelRefs: [validModelRefSummary],
    },
  };

  it('should resolve and encode policy name in the URL', async () => {
    mockRestGET.mockResolvedValue(wrappedInfo);

    const result = await getPolicyInfo('team/policy')({} as never);
    expect(result.policy.name).toBe('test-policy');
    expect(mockRestGET).toHaveBeenCalledWith(
      '',
      expect.stringContaining(encodeURIComponent('team/policy')),
      {},
      {},
    );
  });

  it('should throw when response data fails validation', async () => {
    mockRestGET.mockResolvedValue({
      data: {
        policy: validPolicy,
        modelRefs: [{ name: 'm', namespace: 'ns', modelRef: { kind: 1, name: 'm' } }],
      },
    });

    await expect(getPolicyInfo('x')({} as never)).rejects.toThrow('Invalid response format');
  });
});

describe('createAuthPolicy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleRestFailures.mockImplementation((p: Promise<unknown>) => p);
  });

  const createRequest: CreatePolicyRequest = {
    name: 'new-policy',
    displayName: 'New policy',
    modelRefs: [{ name: 'm', namespace: 'ns' }],
    subjects: { groups: [{ name: 'g' }] },
  };

  it('should resolve and send assembleModArchBody payload to new-policy', async () => {
    mockRestCREATE.mockResolvedValue({ data: validPolicy });

    const result = await createAuthPolicy()({} as never, createRequest);
    expect(result).toStrictEqual(validPolicy);
    expect(mockRestCREATE).toHaveBeenCalledWith(
      '',
      expect.stringContaining('/new-policy'),
      expect.objectContaining({ data: createRequest }),
      {},
      {},
    );
  });

  it('should throw when response data is not a valid policy', async () => {
    mockRestCREATE.mockResolvedValue({ data: { ...validPolicy, name: null } });

    await expect(createAuthPolicy()({} as never, createRequest)).rejects.toThrow(
      'Invalid response format',
    );
  });
});

describe('updateAuthPolicy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleRestFailures.mockImplementation((p: Promise<unknown>) => p);
  });

  const updateRequest: UpdatePolicyRequest = {
    description: 'Updated',
    modelRefs: [{ name: 'm', namespace: 'ns' }],
    subjects: { groups: [{ name: 'g' }] },
  };

  it('should resolve and call update-policy with encoded name and body', async () => {
    mockRestUPDATE.mockResolvedValue({ data: validPolicy });

    const result = await updateAuthPolicy('a/b')({} as never, updateRequest);
    expect(result).toStrictEqual(validPolicy);
    expect(mockRestUPDATE).toHaveBeenCalledWith(
      '',
      expect.stringContaining(encodeURIComponent('a/b')),
      expect.objectContaining({ data: updateRequest }),
      {},
      {},
    );
  });
});

describe('deleteAuthPolicy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleRestFailures.mockImplementation((p: Promise<unknown>) => p);
  });

  it('should resolve with message for a valid response', async () => {
    const body = { data: { message: "MaaSAuthPolicy 'p' deleted successfully" } };
    mockRestDELETE.mockResolvedValue(body);

    const result = await deleteAuthPolicy()({} as never, 'my-policy');
    expect(result).toEqual({ message: "MaaSAuthPolicy 'p' deleted successfully" });
    expect(mockRestDELETE).toHaveBeenCalledWith(
      '',
      expect.stringContaining('/delete-policy/my-policy'),
      {},
      {},
      {},
    );
  });

  it('should throw when message is missing', async () => {
    mockRestDELETE.mockResolvedValue({ data: {} });

    await expect(deleteAuthPolicy()({} as never, 'p')).rejects.toThrow('Invalid response format');
  });
});
