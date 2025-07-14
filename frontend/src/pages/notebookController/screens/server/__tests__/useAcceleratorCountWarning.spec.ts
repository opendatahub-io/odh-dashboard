import { renderHook } from '@testing-library/react';
import useAcceleratorCountWarning from '#~/pages/notebookController/screens/server/useAcceleratorCountWarning';

type DetectedAccelerators = {
  available: Record<string, number>;
};

jest.mock('../useDetectedAccelerators', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('useAcceleratorCountWarning', () => {
  const mockUseDetectedAccelerators = require('../useDetectedAccelerators').default as jest.Mock<
    DetectedAccelerators[]
  >;

  beforeEach(() => {
    mockUseDetectedAccelerators.mockClear();
  });

  it('should return an empty string if identifier is not provided', () => {
    mockUseDetectedAccelerators.mockReturnValue([{ available: {} }]);

    const { result } = renderHook(() => useAcceleratorCountWarning());
    expect(result.current).toBe('');
  });

  it('should return a message if no accelerator is detected for the given identifier', () => {
    mockUseDetectedAccelerators.mockReturnValue([{ available: {} }]);

    const { result } = renderHook(() => useAcceleratorCountWarning(undefined, 'test-id'));
    expect(result.current).toBe('No accelerator detected with the identifier "test-id".');
  });

  it('should return a message if newSize is greater than detected accelerator count', () => {
    mockUseDetectedAccelerators.mockReturnValue([{ available: { 'test-id': 2 } }]);

    const { result } = renderHook(() => useAcceleratorCountWarning(3, 'test-id'));
    expect(result.current).toBe('Only 2 accelerators detected.');
  });

  it('should return an empty string if newSize is less than or equal to detected accelerator count', () => {
    mockUseDetectedAccelerators.mockReturnValue([{ available: { 'test-id': 2 } }]);

    const { result: result1 } = renderHook(() => useAcceleratorCountWarning(2, 'test-id'));
    expect(result1.current).toBe('');

    const { result: result2 } = renderHook(() => useAcceleratorCountWarning(1, 'test-id'));
    expect(result2.current).toBe('');
  });
});
