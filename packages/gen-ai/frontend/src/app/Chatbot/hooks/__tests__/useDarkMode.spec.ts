import { renderHook, act, waitFor } from '@testing-library/react';
import useDarkMode from '~/app/Chatbot/hooks/useDarkMode';

const DARK_MODE_CLASS = 'pf-v6-theme-dark';

/**
 * Helper function to add the dark mode class to the document element
 */
const addDarkModeClass = (): void => {
  document.documentElement.classList.add(DARK_MODE_CLASS);
};

/**
 * Helper function to remove the dark mode class from the document element
 */
const removeDarkModeClass = (): void => {
  document.documentElement.classList.remove(DARK_MODE_CLASS);
};

describe('useDarkMode', () => {
  let originalClassName: string;
  const spies: jest.SpyInstance[] = [];

  beforeEach(() => {
    // Store the original className
    originalClassName = document.documentElement.className;
    // Clear all classes before each test
    document.documentElement.className = '';
  });

  afterEach(() => {
    // Restore original className
    document.documentElement.className = originalClassName;
    // Clean up all spies
    spies.forEach((spy) => spy.mockRestore());
    spies.length = 0;
  });

  it('should return false when dark mode class is not present', () => {
    const { result } = renderHook(() => useDarkMode());
    expect(result.current).toBe(false);
  });

  it('should return true when dark mode class is present initially', () => {
    addDarkModeClass();

    const { result } = renderHook(() => useDarkMode());
    expect(result.current).toBe(true);
  });

  it('should update to true when dark mode class is added', async () => {
    const { result } = renderHook(() => useDarkMode());
    expect(result.current).toBe(false);

    act(() => {
      addDarkModeClass();
    });

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it('should update to false when dark mode class is removed', async () => {
    addDarkModeClass();

    const { result } = renderHook(() => useDarkMode());
    expect(result.current).toBe(true);

    act(() => {
      removeDarkModeClass();
    });

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it('should handle multiple class changes', async () => {
    const { result } = renderHook(() => useDarkMode());
    expect(result.current).toBe(false);

    act(() => {
      addDarkModeClass();
    });
    await waitFor(() => {
      expect(result.current).toBe(true);
    });

    act(() => {
      removeDarkModeClass();
    });
    await waitFor(() => {
      expect(result.current).toBe(false);
    });

    act(() => {
      addDarkModeClass();
    });
    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it('should not be affected by other classes', () => {
    const { result } = renderHook(() => useDarkMode());
    expect(result.current).toBe(false);

    act(() => {
      document.documentElement.classList.add('some-other-class');
    });

    // Should still be false as dark mode class was not added
    expect(result.current).toBe(false);
  });

  it('should work correctly with multiple classes present', async () => {
    document.documentElement.classList.add('some-class', 'another-class');

    const { result } = renderHook(() => useDarkMode());
    expect(result.current).toBe(false);

    act(() => {
      addDarkModeClass();
    });
    await waitFor(() => {
      expect(result.current).toBe(true);
    });

    act(() => {
      removeDarkModeClass();
    });
    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it('should cleanup observer on unmount', () => {
    const disconnectSpy = jest.spyOn(MutationObserver.prototype, 'disconnect');
    spies.push(disconnectSpy);

    const { result, unmount } = renderHook(() => useDarkMode());
    expect(result.current).toBe(false);

    unmount();

    expect(disconnectSpy).toHaveBeenCalled();
  });

  it('should properly observe the document element', () => {
    const observeSpy = jest.spyOn(MutationObserver.prototype, 'observe');
    spies.push(observeSpy);

    renderHook(() => useDarkMode());

    expect(observeSpy).toHaveBeenCalledWith(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
  });
});
