import { renderHook, act } from '@testing-library/react';
import { useBrowserStorage } from 'mod-arch-core';
import { useAutoragMockPipelines } from '~/app/hooks/useAutoragMockPipelines';

jest.mock('mod-arch-core', () => ({
  useBrowserStorage: jest.fn(),
}));

const useBrowserStorageMock = jest.mocked(useBrowserStorage);

describe('useAutoragMockPipelines', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useBrowserStorageMock.mockReturnValue([true, jest.fn()]);
  });

  it('should call useBrowserStorage with correct key and default', () => {
    renderHook(() => useAutoragMockPipelines());

    expect(useBrowserStorageMock).toHaveBeenCalledWith('odh.autorag.mockPipelines', true);
  });

  it('should return useMock true by default', () => {
    const { result } = renderHook(() => useAutoragMockPipelines());

    expect(result.current[0]).toBe(true);
    expect(result.current[1]).toBeDefined();
  });

  it('should return value and setter from useBrowserStorage', () => {
    const mockSet = jest.fn();
    useBrowserStorageMock.mockReturnValue([false, mockSet]);

    const { result } = renderHook(() => useAutoragMockPipelines());

    expect(result.current[0]).toBe(false);
    expect(result.current[1]).toBe(mockSet);
  });

  it('should expose setAutoragMockPipelines on window', () => {
    const mockSet = jest.fn();
    useBrowserStorageMock.mockReturnValue([true, mockSet]);

    renderHook(() => useAutoragMockPipelines());

    expect(window.setAutoragMockPipelines).toBeDefined();
    act(() => {
      window.setAutoragMockPipelines?.(false);
    });
    expect(mockSet).toHaveBeenCalledWith(false);
  });

  it('should clean up window.setAutoragMockPipelines on unmount', () => {
    useBrowserStorageMock.mockReturnValue([true, jest.fn()]);

    const { unmount } = renderHook(() => useAutoragMockPipelines());

    expect(window.setAutoragMockPipelines).toBeDefined();
    unmount();
    expect(window.setAutoragMockPipelines).toBeUndefined();
  });
});
