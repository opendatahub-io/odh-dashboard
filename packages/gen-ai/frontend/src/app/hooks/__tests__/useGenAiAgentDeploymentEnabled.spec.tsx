import { renderHook } from '@testing-library/react';
import { useFeatureFlag } from '@openshift/dynamic-plugin-sdk';
import useFetchBFFConfig from '~/app/hooks/useFetchBFFConfig';
import useGenAiAgentDeploymentEnabled from '~/app/hooks/useGenAiAgentDeploymentEnabled';
import { GEN_AI_AGENT_DEPLOYMENT } from '~/odh/extensions';

jest.mock('@openshift/dynamic-plugin-sdk', () => ({
  useFeatureFlag: jest.fn(),
}));

jest.mock('~/app/hooks/useFetchBFFConfig', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockUseFeatureFlag = jest.mocked(useFeatureFlag);
const mockUseFetchBFFConfig = jest.mocked(useFetchBFFConfig);

describe('useGenAiAgentDeploymentEnabled', () => {
  beforeEach(() => {
    mockUseFeatureFlag.mockReturnValue([true, () => undefined]);
  });

  it.each([
    [true, true],
    [false, false],
  ])('requires the Agent Sandbox CRD to be available', (sandboxesAvailable, expected) => {
    mockUseFetchBFFConfig.mockReturnValue({
      data: { isCustomLSD: false, sandboxesAvailable },
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    const { result } = renderHook(() => useGenAiAgentDeploymentEnabled());

    expect(mockUseFeatureFlag).toHaveBeenCalledWith(GEN_AI_AGENT_DEPLOYMENT);
    expect(result.current).toBe(expected);
  });

  it('should be disabled when the feature flag is off', () => {
    mockUseFeatureFlag.mockReturnValue([false, () => undefined]);
    mockUseFetchBFFConfig.mockReturnValue({
      data: { isCustomLSD: false, sandboxesAvailable: true },
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    const { result } = renderHook(() => useGenAiAgentDeploymentEnabled());

    expect(result.current).toBe(false);
  });
});
