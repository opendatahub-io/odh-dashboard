import * as authPoliciesApi from '~/app/api/auth-policies';
import { testHook, standardUseFetchState } from '~/__tests__/unit/testUtils/hooks';
import type { PolicyInfoResponse } from '~/app/types/auth-policies';
import { useGetPolicyInfo } from '~/app/hooks/useGetPolicyInfo';

jest.mock('~/app/api/auth-policies', () => ({
  ...jest.requireActual('~/app/api/auth-policies'),
  getPolicyInfo: jest.fn(),
}));

const mockGetPolicyInfo = jest.mocked(authPoliciesApi.getPolicyInfo);

const mockPolicyInfo: PolicyInfoResponse = {
  policy: {
    name: 'premium-team-policy',
    namespace: 'maas-system',
    phase: 'Active',
    modelRefs: [{ name: 'granite-3-8b-instruct', namespace: 'maas-models' }],
    subjects: { groups: [{ name: 'premium-users' }] },
  },
  modelRefs: [
    {
      name: 'granite-3-8b-instruct',
      namespace: 'maas-models',
      modelRef: { kind: 'LLMInferenceService', name: 'granite-3-8b-instruct' },
      phase: 'Ready',
    },
  ],
};

describe('useGetPolicyInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null initial state before fetch resolves', () => {
    mockGetPolicyInfo.mockReturnValue(() => new Promise(jest.fn()));

    const renderResult = testHook(useGetPolicyInfo)('premium-team-policy');

    expect(renderResult).hookToStrictEqual(standardUseFetchState(null));
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should resolve to null without calling the API when name is empty', async () => {
    const renderResult = testHook(useGetPolicyInfo)('');

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(standardUseFetchState(null, true));
    expect(mockGetPolicyInfo).not.toHaveBeenCalled();
  });

  it('should resolve to null without calling the API when name is whitespace-only', async () => {
    const renderResult = testHook(useGetPolicyInfo)('   ');

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(standardUseFetchState(null, true));
    expect(mockGetPolicyInfo).not.toHaveBeenCalled();
  });

  it('should return loaded policy info on success', async () => {
    mockGetPolicyInfo.mockReturnValue(() => Promise.resolve(mockPolicyInfo));

    const renderResult = testHook(useGetPolicyInfo)('premium-team-policy');

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(standardUseFetchState(mockPolicyInfo, true));
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetPolicyInfo).toHaveBeenCalledWith('premium-team-policy');
  });

  it('should return error state when fetch fails', async () => {
    const error = new Error('Policy not found');
    mockGetPolicyInfo.mockReturnValue(() => Promise.reject(error));

    const renderResult = testHook(useGetPolicyInfo)('missing-policy');

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(standardUseFetchState(null, false, error));
  });

  it('should re-fetch when policy name changes', async () => {
    mockGetPolicyInfo.mockReturnValue(() => Promise.resolve(mockPolicyInfo));

    const renderResult = testHook(useGetPolicyInfo)('premium-team-policy');
    await renderResult.waitForNextUpdate();

    expect(mockGetPolicyInfo).toHaveBeenCalledWith('premium-team-policy');
    expect(mockGetPolicyInfo).toHaveBeenCalledTimes(1);

    const otherPolicyInfo: PolicyInfoResponse = {
      ...mockPolicyInfo,
      policy: { ...mockPolicyInfo.policy, name: 'basic-team-policy' },
    };
    mockGetPolicyInfo.mockReturnValue(() => Promise.resolve(otherPolicyInfo));

    renderResult.rerender('basic-team-policy');
    await renderResult.waitForNextUpdate();

    expect(mockGetPolicyInfo).toHaveBeenCalledWith('basic-team-policy');
    expect(mockGetPolicyInfo).toHaveBeenCalledTimes(2);
  });
});
