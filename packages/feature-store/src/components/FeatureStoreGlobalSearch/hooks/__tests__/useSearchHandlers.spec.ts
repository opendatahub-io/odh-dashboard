import React from 'react';
import { renderHook } from '@testing-library/react';
import { useNavigate } from 'react-router-dom';
import { TrackingProvider } from '../../../../__tests__/unit/testUtils/TrackingProvider';
import { useSearchHandlers, type ISearchItem } from '../useSearchHandlers';
import { UseSearchStateReturn } from '../useSearchState';
import * as searchUtils from '../../utils/searchUtils';

jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));

jest.mock('../../utils/searchUtils', () => ({
  getFeatureStoreRoute: jest.fn(),
}));

describe('useSearchHandlers', () => {
  let mockNavigate: jest.Mock;
  let mockGetFeatureStoreRoute: jest.Mock;
  let mockState: UseSearchStateReturn;
  let mockOptions: {
    onSearchChange?: jest.Mock;
    onClear?: jest.Mock;
    onSelect?: jest.Mock;
    project?: string;
  };

  beforeEach(() => {
    jest.useFakeTimers();

    mockNavigate = jest.fn();
    mockGetFeatureStoreRoute = jest.fn();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    (searchUtils.getFeatureStoreRoute as jest.Mock).mockImplementation(mockGetFeatureStoreRoute);

    mockState = {
      searchValue: '',
      isSearchOpen: false,
      isSearching: false,
      isSmallScreen: false,
      searchInputRef: { current: document.createElement('input') },
      searchMenuRef: { current: document.createElement('div') },
      setSearchValue: jest.fn(),
      setIsSearchOpen: jest.fn(),
      setIsSearching: jest.fn(),
    };

    mockOptions = {
      onSearchChange: jest.fn(),
      onClear: jest.fn(),
      onSelect: jest.fn(),
      project: 'test-project',
    };

    jest.spyOn(document, 'addEventListener');
    jest.spyOn(document, 'removeEventListener');
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should deliver selection through the current provider before callbacks and navigation', () => {
    const first = jest.fn();
    const second = jest.fn();
    const options = {
      ...mockOptions,
      onSelect: jest.fn(() => expect(second).toHaveBeenCalledTimes(1)),
    };
    const item: ISearchItem = {
      id: 'private-id',
      title: 'private-title',
      description: 'private-description',
      category: 'Entities',
      type: 'entity',
      project: 'private-project',
    };
    mockGetFeatureStoreRoute.mockReturnValue('/entity-route');
    let currentTrackEvent = first;
    const wrapper = ({ children }: React.PropsWithChildren) =>
      React.createElement(TrackingProvider, { trackEvent: currentTrackEvent }, children);
    const { result, rerender } = renderHook(() => useSearchHandlers(mockState, options), {
      wrapper,
    });
    const change = result.current.handleSearchChange;
    currentTrackEvent = second;
    rerender();
    expect(result.current.handleSearchChange).toBe(change);
    result.current.handleResultSelect(item);
    expect(first).not.toHaveBeenCalled();
    expect(second.mock.calls).toEqual([
      ['Feature Store Search Result Selected', { resultType: 'entity', pageType: 'list' }],
    ]);
    expect(options.onSelect).toHaveBeenCalledWith(item);
    expect(mockNavigate).toHaveBeenCalledWith('/entity-route');
  });

  describe('handleSearchChange test cases', () => {
    it('should update search value and trigger debounced search', () => {
      const { result } = renderHook(() => useSearchHandlers(mockState, mockOptions), {
        wrapper: TrackingProvider,
      });

      const mockEvent = {} as React.FormEvent<HTMLInputElement>;
      result.current.handleSearchChange(mockEvent, 'test query');

      expect(mockState.setSearchValue).toHaveBeenCalledWith('test query');
      expect(mockState.setIsSearchOpen).toHaveBeenCalledWith(true);
      expect(mockState.setIsSearching).toHaveBeenCalledWith(true);
      expect(mockOptions.onClear).not.toHaveBeenCalled();

      jest.advanceTimersByTime(300);
      expect(mockOptions.onSearchChange).toHaveBeenCalledWith('test query');
    });

    it('should call onClear for empty value', () => {
      const { result } = renderHook(() => useSearchHandlers(mockState, mockOptions), {
        wrapper: TrackingProvider,
      });

      const mockEvent = {} as React.FormEvent<HTMLInputElement>;
      result.current.handleSearchChange(mockEvent, '');

      expect(mockState.setSearchValue).toHaveBeenCalledWith('');
      expect(mockState.setIsSearchOpen).not.toHaveBeenCalled();
      expect(mockState.setIsSearching).not.toHaveBeenCalled();
      expect(mockOptions.onClear).toHaveBeenCalled();
    });

    it('should trim whitespace and call onClear for whitespace-only value', () => {
      const { result } = renderHook(() => useSearchHandlers(mockState, mockOptions), {
        wrapper: TrackingProvider,
      });

      const mockEvent = {} as React.FormEvent<HTMLInputElement>;
      result.current.handleSearchChange(mockEvent, '   ');

      expect(mockState.setSearchValue).toHaveBeenCalledWith('');
      expect(mockState.setIsSearchOpen).not.toHaveBeenCalled();
      expect(mockState.setIsSearching).not.toHaveBeenCalled();
      expect(mockOptions.onClear).toHaveBeenCalled();
    });

    it('should trim leading and trailing spaces from search value', () => {
      const { result } = renderHook(() => useSearchHandlers(mockState, mockOptions), {
        wrapper: TrackingProvider,
      });

      const mockEvent = {} as React.FormEvent<HTMLInputElement>;
      result.current.handleSearchChange(mockEvent, '  hello world  ');

      expect(mockState.setSearchValue).toHaveBeenCalledWith('hello world');
      expect(mockState.setIsSearchOpen).toHaveBeenCalledWith(true);
      expect(mockState.setIsSearching).toHaveBeenCalledWith(true);
      expect(mockOptions.onClear).not.toHaveBeenCalled();

      jest.advanceTimersByTime(300);
      expect(mockOptions.onSearchChange).toHaveBeenCalledWith('hello world');
    });
  });

  describe('handleSearchClear test cases', () => {
    it('should clear search value and call onClear callback', () => {
      const { result } = renderHook(() => useSearchHandlers(mockState, mockOptions), {
        wrapper: TrackingProvider,
      });

      result.current.handleSearchClear();

      expect(mockState.setSearchValue).toHaveBeenCalledWith('');
      expect(mockState.setIsSearching).toHaveBeenCalledWith(false);
      expect(mockOptions.onClear).toHaveBeenCalled();
    });

    it('should work without onClear callback', () => {
      const optionsWithoutOnClear = { ...mockOptions };
      delete optionsWithoutOnClear.onClear;

      const { result } = renderHook(() => useSearchHandlers(mockState, optionsWithoutOnClear), {
        wrapper: TrackingProvider,
      });

      expect(() => result.current.handleSearchClear()).not.toThrow();
      expect(mockState.setSearchValue).toHaveBeenCalledWith('');
      expect(mockState.setIsSearching).toHaveBeenCalledWith(false);
    });
  });

  describe('handleResultSelect test cases', () => {
    const mockSearchItem: ISearchItem = {
      id: '1',
      title: 'Test Feature',
      description: 'Test description',
      category: 'Features',
      type: 'feature',
      project: 'item-project',
    };

    it('should clear search, close menu, and navigate to route', () => {
      mockGetFeatureStoreRoute.mockReturnValue('/test-route');

      const { result } = renderHook(() => useSearchHandlers(mockState, mockOptions), {
        wrapper: TrackingProvider,
      });

      result.current.handleResultSelect(mockSearchItem);

      expect(mockState.setSearchValue).toHaveBeenCalledWith('');
      expect(mockState.setIsSearchOpen).toHaveBeenCalledWith(false);
      expect(mockOptions.onSelect).toHaveBeenCalledWith(mockSearchItem);
      expect(mockGetFeatureStoreRoute).toHaveBeenCalledWith(
        'feature',
        'test-project',
        'Test Feature',
        '',
      );
      expect(mockNavigate).toHaveBeenCalledWith('/test-route');
    });

    it('should use item project when no project option provided', () => {
      const optionsWithoutProject = { ...mockOptions };
      delete optionsWithoutProject.project;
      mockGetFeatureStoreRoute.mockReturnValue('/test-route');

      const { result } = renderHook(() => useSearchHandlers(mockState, optionsWithoutProject), {
        wrapper: TrackingProvider,
      });

      result.current.handleResultSelect(mockSearchItem);

      expect(mockGetFeatureStoreRoute).toHaveBeenCalledWith(
        'feature',
        'item-project',
        'Test Feature',
        '',
      );
    });

    it('should use item project when project option is empty', () => {
      const optionsWithEmptyProject = { ...mockOptions, project: '' };
      mockGetFeatureStoreRoute.mockReturnValue('/test-route');

      const { result } = renderHook(() => useSearchHandlers(mockState, optionsWithEmptyProject), {
        wrapper: TrackingProvider,
      });

      result.current.handleResultSelect(mockSearchItem);

      expect(mockGetFeatureStoreRoute).toHaveBeenCalledWith(
        'feature',
        'item-project',
        'Test Feature',
        '',
      );
    });

    it('should pass featureView when provided', () => {
      const itemWithFeatureView = {
        ...mockSearchItem,
        featureView: 'test-feature-view',
      };
      mockGetFeatureStoreRoute.mockReturnValue('/test-route');

      const { result } = renderHook(() => useSearchHandlers(mockState, mockOptions), {
        wrapper: TrackingProvider,
      });

      result.current.handleResultSelect(itemWithFeatureView);

      expect(mockGetFeatureStoreRoute).toHaveBeenCalledWith(
        'feature',
        'test-project',
        'Test Feature',
        'test-feature-view',
      );
      expect(mockNavigate).toHaveBeenCalledWith('/test-route');
    });

    it('should not navigate when no route is returned', () => {
      mockGetFeatureStoreRoute.mockReturnValue(null);

      const { result } = renderHook(() => useSearchHandlers(mockState, mockOptions), {
        wrapper: TrackingProvider,
      });
      result.current.handleResultSelect(mockSearchItem);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should not navigate when item has no type', () => {
      const itemWithoutType = { ...mockSearchItem, type: '' };

      const { result } = renderHook(() => useSearchHandlers(mockState, mockOptions), {
        wrapper: TrackingProvider,
      });

      result.current.handleResultSelect(itemWithoutType);
      expect(mockGetFeatureStoreRoute).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('keyboard event handling test cases', () => {
    it('should clear search on Escape key when search is open', () => {
      mockState.isSearchOpen = true;
      mockState.searchValue = 'test';

      renderHook(() => useSearchHandlers(mockState, mockOptions), { wrapper: TrackingProvider });

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);

      expect(mockState.setSearchValue).toHaveBeenCalledWith('');
      expect(mockState.setIsSearchOpen).toHaveBeenCalledWith(false);
      expect(mockState.setIsSearching).toHaveBeenCalledWith(false);
      expect(mockOptions.onClear).toHaveBeenCalled();
    });

    it('should clear search on Escape key when search value is not empty', () => {
      mockState.isSearchOpen = false;
      mockState.searchValue = 'test';

      renderHook(() => useSearchHandlers(mockState, mockOptions), { wrapper: TrackingProvider });

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);

      expect(mockState.setSearchValue).toHaveBeenCalledWith('');
      expect(mockState.setIsSearchOpen).toHaveBeenCalledWith(false);
      expect(mockState.setIsSearching).toHaveBeenCalledWith(false);
    });

    it('should not react to Escape when search is closed and empty', () => {
      mockState.isSearchOpen = false;
      mockState.searchValue = '';

      renderHook(() => useSearchHandlers(mockState, mockOptions), { wrapper: TrackingProvider });

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);

      expect(mockState.setSearchValue).not.toHaveBeenCalled();
      expect(mockState.setIsSearchOpen).not.toHaveBeenCalled();
      expect(mockState.setIsSearching).not.toHaveBeenCalled();
    });

    it('should not react to other keys', () => {
      mockState.isSearchOpen = true;

      renderHook(() => useSearchHandlers(mockState, mockOptions), { wrapper: TrackingProvider });

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      document.dispatchEvent(enterEvent);

      expect(mockState.setSearchValue).not.toHaveBeenCalled();
      expect(mockState.setIsSearchOpen).not.toHaveBeenCalled();
      expect(mockState.setIsSearching).not.toHaveBeenCalled();
    });
  });

  describe('click outside handling for search menu test cases', () => {
    it('should close search when clicking outside', () => {
      const outsideElement = document.createElement('div');
      document.body.appendChild(outsideElement);

      renderHook(() => useSearchHandlers(mockState, mockOptions), { wrapper: TrackingProvider });

      const mouseEvent = new MouseEvent('mousedown', { bubbles: true });
      Object.defineProperty(mouseEvent, 'target', { value: outsideElement });
      document.dispatchEvent(mouseEvent);

      expect(mockState.setSearchValue).toHaveBeenCalledWith('');
      expect(mockState.setIsSearchOpen).toHaveBeenCalledWith(false);
      expect(mockState.setIsSearching).toHaveBeenCalledWith(false);
      expect(mockOptions.onClear).toHaveBeenCalled();

      document.body.removeChild(outsideElement);
    });

    it('should not close search when clicking on search input', () => {
      renderHook(() => useSearchHandlers(mockState, mockOptions), { wrapper: TrackingProvider });

      const mouseEvent = new MouseEvent('mousedown', { bubbles: true });
      Object.defineProperty(mouseEvent, 'target', { value: mockState.searchInputRef.current });
      document.dispatchEvent(mouseEvent);

      expect(mockState.setSearchValue).not.toHaveBeenCalled();
      expect(mockState.setIsSearchOpen).not.toHaveBeenCalled();
      expect(mockState.setIsSearching).not.toHaveBeenCalled();
    });

    it('should not close search when clicking on search menu', () => {
      renderHook(() => useSearchHandlers(mockState, mockOptions), { wrapper: TrackingProvider });

      const mouseEvent = new MouseEvent('mousedown', { bubbles: true });
      Object.defineProperty(mouseEvent, 'target', { value: mockState.searchMenuRef.current });
      document.dispatchEvent(mouseEvent);

      expect(mockState.setSearchValue).not.toHaveBeenCalled();
      expect(mockState.setIsSearchOpen).not.toHaveBeenCalled();
      expect(mockState.setIsSearching).not.toHaveBeenCalled();
    });

    it('should handle null refs gracefully', () => {
      const stateWithNullRefs = {
        ...mockState,
        searchInputRef: { current: null },
        searchMenuRef: { current: null },
      };

      renderHook(() => useSearchHandlers(stateWithNullRefs, mockOptions), {
        wrapper: TrackingProvider,
      });

      const outsideElement = document.createElement('div');
      const mouseEvent = new MouseEvent('mousedown', { bubbles: true });
      Object.defineProperty(mouseEvent, 'target', { value: outsideElement });
      expect(() => document.dispatchEvent(mouseEvent)).not.toThrow();
    });
  });

  describe('cleanup test cases', () => {
    it('should remove event listeners on unmount', () => {
      const { unmount } = renderHook(() => useSearchHandlers(mockState, mockOptions), {
        wrapper: TrackingProvider,
      });

      const addEventListenerCalls = (document.addEventListener as jest.Mock).mock.calls.length;
      unmount();
      expect(document.removeEventListener).toHaveBeenCalledTimes(addEventListenerCalls);
    });

    it('should clear timeout on unmount', () => {
      const { result, unmount } = renderHook(() => useSearchHandlers(mockState, mockOptions), {
        wrapper: TrackingProvider,
      });
      const mockEvent = {} as React.FormEvent<HTMLInputElement>;
      result.current.handleSearchChange(mockEvent, 'test');
      unmount();
      jest.advanceTimersByTime(300);
      expect(mockOptions.onSearchChange).not.toHaveBeenCalled();
    });
  });
});
