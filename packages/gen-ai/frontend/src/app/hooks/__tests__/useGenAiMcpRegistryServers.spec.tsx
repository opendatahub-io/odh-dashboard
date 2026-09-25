import { renderHook } from '@testing-library/react';
import { useFeatureFlag } from '@openshift/dynamic-plugin-sdk';
import useGenAiMcpRegistryServers from '~/app/hooks/useGenAiMcpRegistryServers';
import { GEN_AI_MCP_REGISTRY_SERVERS } from '~/odh/extensions';

jest.mock('@openshift/dynamic-plugin-sdk', () => ({
  useFeatureFlag: jest.fn(),
}));

const mockUseFeatureFlag = jest.mocked(useFeatureFlag);

describe('useGenAiMcpRegistryServers', () => {
  it.each([
    [true, true],
    [false, false],
  ])('returns the dynamic plugin feature flag value', (enabled, expected) => {
    mockUseFeatureFlag.mockReturnValue([enabled, () => undefined]);

    const { result } = renderHook(() => useGenAiMcpRegistryServers());

    expect(mockUseFeatureFlag).toHaveBeenCalledWith(GEN_AI_MCP_REGISTRY_SERVERS);
    expect(result.current).toBe(expected);
  });
});
