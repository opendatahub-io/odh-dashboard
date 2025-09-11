import { renderHook } from '@testing-library/react';
import { useNavigate } from 'react-router-dom';
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
      timeoutRef: { current: undefined },
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

  describe('handleSearchChange test cases', () => {
    it('should update search value and trigger debounced search', () => {
      const { result } = renderHook(() => useSearchHandlers(mockState, mockOptions));

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
      const { result } = renderHook(() => useSearchHandlers(mockState, mockOptions));

      const mockEvent = {} as React.FormEvent<HTMLInputElement>;
      result.current.handleSearchChange(mockEvent, '');

      expect(mockState.setSearchValue).toHaveBeenCalledWith('');
      expect(mockState.setIsSearchOpen).not.toHaveBeenCalled();
      expect(mockState.setIsSearching).not.toHaveBeenCalled();
      expect(mockOptions.onClear).toHaveBeenCalled();
    });

    it('should trim whitespace and call onClear for whitespace-only value', () => {
      const { result } = renderHook(() => useSearchHandlers(mockState, mockOptions));

      const mockEvent = {} as React.FormEvent<HTMLInputElement>;
      result.current.handleSearchChange(mockEvent, '   ');

      expect(mockState.setSearchValue).toHaveBeenCalledWith('');
      expect(mockState.setIsSearchOpen).not.toHaveBeenCalled();
      expect(mockState.setIsSearching).not.toHaveBeenCalled();
      expect(mockOptions.onClear).toHaveBeenCalled();
    });

    it('should trim leading and trailing spaces from search value', () => {
      const { result } = renderHook(() => useSearchHandlers(mockState, mockOptions));

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
      const { result } = renderHook(() => useSearchHandlers(mockState, mockOptions));

      result.current.handleSearchClear();

      expect(mockState.setSearchValue).toHaveBeenCalledWith('');
      expect(mockState.setIsSearching).toHaveBeenCalledWith(false);
      expect(mockOptions.onClear).toHaveBeenCalled();
    });

    it('should work without onClear callback', () => {
      const optionsWithoutOnClear = { ...mockOptions };
      delete optionsWithoutOnClear.onClear;

      const { result } = renderHook(() => useSearchHandlers(mockState, optionsWithoutOnClear));

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

      const { result } = renderHook(() => useSearchHandlers(mockState, mockOptions));

      result.current.handleResultSelect(mockSearchItem);

      expect(mockState.setSearchValue).toHaveBeenCalledWith('');
      expect(mockState.setIsSearchOpen).toHaveBeenCalledWith(false);
      expect(mockOptions.onSelect).toHaveBeenCalledWith(mockSearchItem);
      expect(mockGetFeatureStoreRoute).toHaveBeenCalledWith(
        'feature',
        'test-project',
        'Test Feature',
      );
      expect(mockNavigate).toHaveBeenCalledWith('/test-route');
    });

    it('should use item project when no project option provided', () => {
      const optionsWithoutProject = { ...mockOptions };
      delete optionsWithoutProject.project;
      mockGetFeatureStoreRoute.mockReturnValue('/test-route');

      const { result } = renderHook(() => useSearchHandlers(mockState, optionsWithoutProject));

      result.current.handleResultSelect(mockSearchItem);

      expect(mockGetFeatureStoreRoute).toHaveBeenCalledWith(
        'feature',
        'item-project',
        'Test Feature',
      );
    });

    it('should use item project when project option is empty', () => {
      const optionsWithEmptyProject = { ...mockOptions, project: '' };
      mockGetFeatureStoreRoute.mockReturnValue('/test-route');

      const { result } = renderHook(() => useSearchHandlers(mockState, optionsWithEmptyProject));

      result.current.handleResultSelect(mockSearchItem);

      expect(mockGetFeatureStoreRoute).toHaveBeenCalledWith(
        'feature',
        'item-project',
        'Test Feature',
      );
    });

    it('should not navigate when no route is returned', () => {
      mockGetFeatureStoreRoute.mockReturnValue(null);

      const { result } = renderHook(() => useSearchHandlers(mockState, mockOptions));
      result.current.handleResultSelect(mockSearchItem);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should not navigate when item has no type', () => {
      const itemWithoutType = { ...mockSearchItem, type: '' };

      const { result } = renderHook(() => useSearchHandlers(mockState, mockOptions));

      result.current.handleResultSelect(itemWithoutType);
      expect(mockGetFeatureStoreRoute).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('keyboard event handling test cases', () => {
    it('should clear search on Escape key when search is open', () => {
      mockState.isSearchOpen = true;
      mockState.searchValue = 'test';

      renderHook(() => useSearchHandlers(mockState, mockOptions));

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

      renderHook(() => useSearchHandlers(mockState, mockOptions));

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);

      expect(mockState.setSearchValue).toHaveBeenCalledWith('');
      expect(mockState.setIsSearchOpen).toHaveBeenCalledWith(false);
      expect(mockState.setIsSearching).toHaveBeenCalledWith(false);
    });

    it('should not react to Escape when search is closed and empty', () => {
      mockState.isSearchOpen = false;
      mockState.searchValue = '';

      renderHook(() => useSearchHandlers(mockState, mockOptions));

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);

      expect(mockState.setSearchValue).not.toHaveBeenCalled();
      expect(mockState.setIsSearchOpen).not.toHaveBeenCalled();
      expect(mockState.setIsSearching).not.toHaveBeenCalled();
    });

    it('should not react to other keys', () => {
      mockState.isSearchOpen = true;

      renderHook(() => useSearchHandlers(mockState, mockOptions));

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

      renderHook(() => useSearchHandlers(mockState, mockOptions));

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
      renderHook(() => useSearchHandlers(mockState, mockOptions));

      const mouseEvent = new MouseEvent('mousedown', { bubbles: true });
      Object.defineProperty(mouseEvent, 'target', { value: mockState.searchInputRef.current });
      document.dispatchEvent(mouseEvent);

      expect(mockState.setSearchValue).not.toHaveBeenCalled();
      expect(mockState.setIsSearchOpen).not.toHaveBeenCalled();
      expect(mockState.setIsSearching).not.toHaveBeenCalled();
    });

    it('should not close search when clicking on search menu', () => {
      renderHook(() => useSearchHandlers(mockState, mockOptions));

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

      renderHook(() => useSearchHandlers(stateWithNullRefs, mockOptions));

      const outsideElement = document.createElement('div');
      const mouseEvent = new MouseEvent('mousedown', { bubbles: true });
      Object.defineProperty(mouseEvent, 'target', { value: outsideElement });
      expect(() => document.dispatchEvent(mouseEvent)).not.toThrow();
    });
  });

  describe('cleanup test cases', () => {
    it('should remove event listeners on unmount', () => {
      const { unmount } = renderHook(() => useSearchHandlers(mockState, mockOptions));

      const addEventListenerCalls = (document.addEventListener as jest.Mock).mock.calls.length;
      unmount();
      expect(document.removeEventListener).toHaveBeenCalledTimes(addEventListenerCalls);
    });

    it('should clear timeout on unmount', () => {
      const { result, unmount } = renderHook(() => useSearchHandlers(mockState, mockOptions));
      const mockEvent = {} as React.FormEvent<HTMLInputElement>;
      result.current.handleSearchChange(mockEvent, 'test');
      unmount();
      jest.advanceTimersByTime(300);
      expect(mockOptions.onSearchChange).not.toHaveBeenCalled();
    });
  });
});
