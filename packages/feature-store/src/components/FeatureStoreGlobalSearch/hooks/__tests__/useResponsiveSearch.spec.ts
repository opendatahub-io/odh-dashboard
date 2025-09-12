import type React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { useResponsiveSearch } from '../useResponsiveSearch';

const mockGetBoundingClientRect = jest.fn();

describe('useResponsiveSearch', () => {
  let mockContainerRef: React.RefObject<HTMLDivElement>;

  beforeEach(() => {
    mockGetBoundingClientRect.mockReset();
    mockGetBoundingClientRect.mockReturnValue({ width: 200 });
    mockContainerRef = {
      current: {
        getBoundingClientRect: mockGetBoundingClientRect,
      } as unknown as HTMLDivElement,
    };
    jest.spyOn(window, 'addEventListener').mockImplementation();
    jest.spyOn(window, 'removeEventListener').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('searchInputStyle', () => {
    it('should return 100% width for small screens', () => {
      const { result } = renderHook(() => useResponsiveSearch(true, mockContainerRef));

      expect(result.current.searchInputStyle).toEqual({
        width: '100%',
        maxWidth: '100%',
      });
    });

    it('should return 25ch width for large screens', () => {
      const { result } = renderHook(() => useResponsiveSearch(false, mockContainerRef));

      expect(result.current.searchInputStyle).toEqual({
        width: '25ch',
        maxWidth: '25ch',
      });
    });

    it('should update when isSmallScreen changes', () => {
      const { result, rerender } = renderHook(
        ({ isSmallScreen }) => useResponsiveSearch(isSmallScreen, mockContainerRef),
        { initialProps: { isSmallScreen: true } },
      );

      expect(result.current.searchInputStyle.width).toBe('100%');
      rerender({ isSmallScreen: false });
      expect(result.current.searchInputStyle.width).toBe('25ch');
    });
  });

  describe('searchMenuStyle', () => {
    it('should use inputWidth for small screens', () => {
      mockGetBoundingClientRect.mockReturnValue({ width: 320 });

      const { result } = renderHook(() => useResponsiveSearch(true, mockContainerRef));
      expect(result.current.searchMenuStyle).toEqual({
        width: '320px',
        marginLeft: '0',
        transform: 'none',
      });
    });

    it('should use 75ch for large screens', () => {
      mockGetBoundingClientRect.mockReturnValue({ width: 400 });

      const { result } = renderHook(() => useResponsiveSearch(false, mockContainerRef));
      expect(result.current.searchMenuStyle).toEqual({
        width: '75ch',
        marginLeft: '0',
        transform: 'none',
      });
    });

    it('should handle zero width gracefully', () => {
      mockGetBoundingClientRect.mockReturnValue({ width: 0 });
      const { result } = renderHook(() => useResponsiveSearch(true, mockContainerRef));
      expect(result.current.searchMenuStyle.width).toBe('0px');
    });
  });

  describe('width measurement', () => {
    it('should measure width on mount', () => {
      mockGetBoundingClientRect.mockReturnValue({ width: 250 });
      renderHook(() => useResponsiveSearch(true, mockContainerRef));
      expect(mockGetBoundingClientRect).toHaveBeenCalledTimes(1);
    });

    it('should handle null containerRef', () => {
      const nullRef = { current: null };
      const { result } = renderHook(() => useResponsiveSearch(true, nullRef));
      expect(result.current.searchMenuStyle.width).toBe('0px');
    });
  });

  describe('resize behavior', () => {
    it('should update width on resize', async () => {
      mockGetBoundingClientRect.mockReset();
      mockGetBoundingClientRect
        .mockReturnValueOnce({ width: 200 })
        .mockReturnValueOnce({ width: 300 });

      const { result } = renderHook(() => useResponsiveSearch(true, mockContainerRef));
      const resizeHandler = (window.addEventListener as jest.Mock).mock.calls.find(
        (call) => call[0] === 'resize',
      )[1];

      expect(result.current.searchMenuStyle.width).toBe('200px');
      resizeHandler();

      await waitFor(() => {
        expect(result.current.searchMenuStyle.width).toBe('300px');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle containerRef becoming null after initial render', () => {
      mockGetBoundingClientRect.mockReturnValue({ width: 200 });

      const { result, rerender } = renderHook(
        ({ containerRef }) => useResponsiveSearch(true, containerRef),
        { initialProps: { containerRef: mockContainerRef } },
      );

      expect(result.current.searchMenuStyle.width).toBe('200px');
      rerender({ containerRef: { current: null } });
      expect(result.current.searchMenuStyle.width).toBe('200px');
    });
  });
});
