import { renderHook } from '@testing-library/react';
import { useFeatureFlag } from '@openshift/dynamic-plugin-sdk';
import useGenAiImageUploadEnabled from '~/app/hooks/useGenAiImageUploadEnabled';
import { GEN_AI_IMAGE_UPLOAD } from '~/odh/extensions';

jest.mock('@openshift/dynamic-plugin-sdk', () => ({
  useFeatureFlag: jest.fn(),
}));

const mockUseFeatureFlag = jest.mocked(useFeatureFlag);

describe('useGenAiImageUploadEnabled', () => {
  it.each([true, false])('should return the image upload feature flag value', (enabled) => {
    mockUseFeatureFlag.mockReturnValue([enabled, () => undefined]);

    const { result } = renderHook(() => useGenAiImageUploadEnabled());

    expect(mockUseFeatureFlag).toHaveBeenCalledWith(GEN_AI_IMAGE_UPLOAD);
    expect(result.current).toBe(enabled);
  });
});
