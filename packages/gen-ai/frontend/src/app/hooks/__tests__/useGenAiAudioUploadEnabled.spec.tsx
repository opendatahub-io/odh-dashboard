import { renderHook } from '@testing-library/react';
import { useFeatureFlag } from '@openshift/dynamic-plugin-sdk';
import useGenAiAudioUploadEnabled from '~/app/hooks/useGenAiAudioUploadEnabled';
import { GEN_AI_AUDIO_UPLOAD } from '~/odh/extensions';

jest.mock('@openshift/dynamic-plugin-sdk', () => ({
  useFeatureFlag: jest.fn(),
}));

const mockUseFeatureFlag = jest.mocked(useFeatureFlag);

describe('useGenAiAudioUploadEnabled', () => {
  it.each([true, false])('should return the audio upload feature flag value', (enabled) => {
    mockUseFeatureFlag.mockReturnValue([enabled, () => undefined]);

    const { result } = renderHook(() => useGenAiAudioUploadEnabled());

    expect(mockUseFeatureFlag).toHaveBeenCalledWith(GEN_AI_AUDIO_UPLOAD);
    expect(result.current).toBe(enabled);
  });
});
