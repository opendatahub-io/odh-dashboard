import { renderHook, waitFor } from '@testing-library/react';
import { useSearchState } from '../useSearchState';

Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024,
});

describe('useSearchState', () => {
  beforeEach(() => {
    window.innerWidth = 1024;
    jest.spyOn(window, 'addEventListener').mockImplementation();
    jest.spyOn(window, 'removeEventListener').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should return initial state values', () => {
      const { result } = renderHook(() => useSearchState());

      expect(result.current.searchValue).toBe('');
      expect(result.current.isSearchOpen).toBe(false);
      expect(result.current.isSmallScreen).toBe(false);
      expect(result.current.isSearching).toBe(false);
      expect(result.current.searchInputRef.current).toBeNull();
      expect(result.current.searchMenuRef.current).toBeNull();
      expect(result.current.timeoutRef.current).toBeUndefined();
    });

    it('should detect small screen on initial load', () => {
      window.innerWidth = 600;
      const { result } = renderHook(() => useSearchState());
      expect(result.current.isSmallScreen).toBe(true);
    });

    it('should detect large screen on initial load', () => {
      window.innerWidth = 1200;

      const { result } = renderHook(() => useSearchState());

      expect(result.current.isSmallScreen).toBe(false);
    });

    it('should handle edge case at breakpoint', () => {
      window.innerWidth = 768;
      const { result } = renderHook(() => useSearchState());
      expect(result.current.isSmallScreen).toBe(true);
    });
  });

  describe('search value state management', () => {
    it('should update search value when setSearchValue is called', async () => {
      const { result } = renderHook(() => useSearchState());

      expect(result.current.searchValue).toBe('');
      result.current.setSearchValue('test query');
      await waitFor(() => {
        expect(result.current.searchValue).toBe('test query');
      });
    });

    it('should open search when search value is not empty', async () => {
      const { result } = renderHook(() => useSearchState());

      expect(result.current.isSearchOpen).toBe(false);
      result.current.setSearchValue('test');
      await waitFor(() => {
        expect(result.current.isSearchOpen).toBe(true);
      });
    });

    it('should close search when search value is empty', async () => {
      const { result } = renderHook(() => useSearchState());
      result.current.setSearchValue('test');
      await waitFor(() => {
        expect(result.current.isSearchOpen).toBe(true);
      });
      result.current.setSearchValue('');
      await waitFor(() => {
        expect(result.current.isSearchOpen).toBe(false);
      });
    });

    it('should close search when search value is only whitespace', async () => {
      const { result } = renderHook(() => useSearchState());

      result.current.setSearchValue('   ');
      await waitFor(() => {
        expect(result.current.isSearchOpen).toBe(false);
      });
    });

    it('should keep search open for whitespace with content', async () => {
      const { result } = renderHook(() => useSearchState());

      result.current.setSearchValue('  test  ');
      await waitFor(() => {
        expect(result.current.isSearchOpen).toBe(true);
      });
    });
  });

  describe('search state management', () => {
    it('should reset isSearching to false when isLoading becomes false', async () => {
      const { result, rerender } = renderHook(({ isLoading }) => useSearchState({ isLoading }), {
        initialProps: { isLoading: true },
      });

      result.current.setIsSearching(true);
      await waitFor(() => {
        expect(result.current.isSearching).toBe(true);
      });
      rerender({ isLoading: false });
      await waitFor(() => {
        expect(result.current.isSearching).toBe(false);
      });
    });

    it('should not reset isSearching when isLoading remains true', async () => {
      const { result, rerender } = renderHook(({ isLoading }) => useSearchState({ isLoading }), {
        initialProps: { isLoading: true },
      });

      result.current.setIsSearching(true);
      await waitFor(() => {
        expect(result.current.isSearching).toBe(true);
      });
      rerender({ isLoading: true });
      await waitFor(() => {
        expect(result.current.isSearching).toBe(true);
      });
    });
  });

  describe('responsive behavior', () => {
    it('should add resize event listener on mount', () => {
      renderHook(() => useSearchState());

      expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    });
    it('should remove resize event listener on unmount', () => {
      const { unmount } = renderHook(() => useSearchState());
      unmount();
      expect(window.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('should update isSmallScreen on window resize', async () => {
      const { result } = renderHook(() => useSearchState());
      expect(result.current.isSmallScreen).toBe(false);
      const resizeHandler = (window.addEventListener as jest.Mock).mock.calls.find(
        (call) => call[0] === 'resize',
      )[1];
      window.innerWidth = 600;
      resizeHandler();
      await waitFor(() => {
        expect(result.current.isSmallScreen).toBe(true);
      });
    });

    it('should update from small to large screen on resize', async () => {
      window.innerWidth = 600;
      const { result } = renderHook(() => useSearchState());

      expect(result.current.isSmallScreen).toBe(true);
      const resizeHandler = (window.addEventListener as jest.Mock).mock.calls.find(
        (call) => call[0] === 'resize',
      )[1];
      window.innerWidth = 1200;
      resizeHandler();

      await waitFor(() => {
        expect(result.current.isSmallScreen).toBe(false);
      });
    });

    it('should handle multiple resize events correctly', async () => {
      const { result } = renderHook(() => useSearchState());

      const resizeHandler = (window.addEventListener as jest.Mock).mock.calls.find(
        (call) => call[0] === 'resize',
      )[1];
      window.innerWidth = 500;
      resizeHandler();
      await waitFor(() => {
        expect(result.current.isSmallScreen).toBe(true);
      });
      window.innerWidth = 1000;
      resizeHandler();
      await waitFor(() => {
        expect(result.current.isSmallScreen).toBe(false);
      });
      window.innerWidth = 700;
      resizeHandler();
      await waitFor(() => {
        expect(result.current.isSmallScreen).toBe(true);
      });
    });
  });

  describe('refs', () => {
    it('should provide required ref objects for component integration', () => {
      const { result } = renderHook(() => useSearchState());
      expect(result.current.searchInputRef).toBeDefined();
      expect(result.current.searchMenuRef).toBeDefined();
      expect(result.current.timeoutRef).toBeDefined();
      expect(result.current.searchInputRef.current).toBeNull();
      expect(result.current.searchMenuRef.current).toBeNull();
      expect(result.current.timeoutRef.current).toBeUndefined();
    });
  });

  describe('timeout cleanup', () => {
    it('should clear timeout on unmount', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const { result, unmount } = renderHook(() => useSearchState());

      const mockTimeout = setTimeout(() => {
        // Mock timeout function
      }, 1000) as NodeJS.Timeout;
      result.current.timeoutRef.current = mockTimeout;

      unmount();
      expect(clearTimeoutSpy).toHaveBeenCalledWith(mockTimeout);
      clearTimeoutSpy.mockRestore();
    });

    it('should not call clearTimeout if no timeout is set', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const { unmount } = renderHook(() => useSearchState());

      unmount();
      expect(clearTimeoutSpy).not.toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('options handling', () => {
    it('should work with default options and handle isLoading parameter', () => {
      const { result: defaultResult } = renderHook(() => useSearchState());
      expect(defaultResult.current.searchValue).toBe('');
      expect(defaultResult.current.isSearchOpen).toBe(false);
      expect(defaultResult.current.isSearching).toBe(false);

      const { result: loadingResult } = renderHook(() => useSearchState({ isLoading: true }));
      expect(loadingResult.current.searchValue).toBe('');
      expect(loadingResult.current.isSearchOpen).toBe(false);
      expect(loadingResult.current.isSearching).toBe(false);
    });
  });

  describe('integration behavior', () => {
    it('should maintain search open state when isLoading changes but search value remains', async () => {
      const { result, rerender } = renderHook(({ isLoading }) => useSearchState({ isLoading }), {
        initialProps: { isLoading: false },
      });

      result.current.setSearchValue('test query');
      await waitFor(() => {
        expect(result.current.isSearchOpen).toBe(true);
      });

      rerender({ isLoading: true });
      await waitFor(() => {
        expect(result.current.isSearchOpen).toBe(true);
      });

      rerender({ isLoading: false });
      await waitFor(() => {
        expect(result.current.isSearchOpen).toBe(true);
      });
    });

    it('should close search when value is cleared regardless of isLoading', async () => {
      const { result, rerender } = renderHook(({ isLoading }) => useSearchState({ isLoading }), {
        initialProps: { isLoading: true },
      });

      result.current.setSearchValue('test query');
      await waitFor(() => {
        expect(result.current.isSearchOpen).toBe(true);
      });

      result.current.setSearchValue('');
      await waitFor(() => {
        expect(result.current.isSearchOpen).toBe(false);
      });

      rerender({ isLoading: false });
      await waitFor(() => {
        expect(result.current.isSearchOpen).toBe(false);
      });
    });
  });
});
