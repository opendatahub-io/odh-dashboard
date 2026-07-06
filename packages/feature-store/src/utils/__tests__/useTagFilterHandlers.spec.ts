import { renderHook, act } from '@testing-library/react';
import { useTagFilterHandlers } from '../useTagFilterHandlers';

describe('useTagFilterHandlers', () => {
  let mockSetTagFilters: jest.Mock;
  let mockSetCurrentFilterType: jest.Mock;

  beforeEach(() => {
    mockSetTagFilters = jest.fn();
    mockSetCurrentFilterType = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleTagClick', () => {
    it('should add a new tag when tag does not exist', () => {
      const { result } = renderHook(() =>
        useTagFilterHandlers(mockSetTagFilters, mockSetCurrentFilterType),
      );

      act(() => {
        result.current.handleTagClick('domain=transaction');
      });

      expect(mockSetTagFilters).toHaveBeenCalledWith(expect.any(Function));

      const setTagFiltersCallback = mockSetTagFilters.mock.calls[0][0];
      const resultTags = setTagFiltersCallback(['cardinality=high']);
      expect(resultTags).toEqual(['cardinality=high', 'domain=transaction']);
    });

    it('should not add duplicate tags', () => {
      const { result } = renderHook(() =>
        useTagFilterHandlers(mockSetTagFilters, mockSetCurrentFilterType),
      );

      act(() => {
        result.current.handleTagClick('domain=transaction');
      });

      act(() => {
        result.current.handleTagClick('domain=transaction');
      });

      expect(mockSetTagFilters).toHaveBeenCalledTimes(2);

      const firstCallback = mockSetTagFilters.mock.calls[0][0];
      const firstResult = firstCallback(['cardinality=high']);
      expect(firstResult).toEqual(['cardinality=high', 'domain=transaction']);

      const secondCallback = mockSetTagFilters.mock.calls[1][0];
      const secondResult = secondCallback(['cardinality=high', 'domain=transaction']);
      expect(secondResult).toEqual(['cardinality=high', 'domain=transaction']);
    });

    it('should set current filter type to "tag" when setCurrentFilterType is provided', () => {
      const { result } = renderHook(() =>
        useTagFilterHandlers(mockSetTagFilters, mockSetCurrentFilterType),
      );

      act(() => {
        result.current.handleTagClick('domain=transaction');
      });

      expect(mockSetCurrentFilterType).toHaveBeenCalledWith('tag');
    });

    it('should not call setCurrentFilterType when it is not provided', () => {
      const { result } = renderHook(() => useTagFilterHandlers(mockSetTagFilters));

      act(() => {
        result.current.handleTagClick('domain=transaction');
      });

      expect(mockSetCurrentFilterType).not.toHaveBeenCalled();
    });
  });

  describe('handleTagFilterRemove', () => {
    it('should remove the specified tag', () => {
      const { result } = renderHook(() =>
        useTagFilterHandlers(mockSetTagFilters, mockSetCurrentFilterType),
      );

      act(() => {
        result.current.handleTagFilterRemove('domain=transaction');
      });

      expect(mockSetTagFilters).toHaveBeenCalledWith(expect.any(Function));

      const setTagFiltersCallback = mockSetTagFilters.mock.calls[0][0];
      const resultTags = setTagFiltersCallback([
        'cardinality=high',
        'domain=transaction',
        'type=feature',
      ]);
      expect(resultTags).toEqual(['cardinality=high', 'type=feature']);
    });

    it('should handle removing non-existent tag gracefully', () => {
      const { result } = renderHook(() =>
        useTagFilterHandlers(mockSetTagFilters, mockSetCurrentFilterType),
      );

      act(() => {
        result.current.handleTagFilterRemove('non-existent-tag');
      });

      expect(mockSetTagFilters).toHaveBeenCalledWith(expect.any(Function));

      const setTagFiltersCallback = mockSetTagFilters.mock.calls[0][0];
      const resultTags = setTagFiltersCallback(['cardinality=high', 'domain=transaction']);
      expect(resultTags).toEqual(['cardinality=high', 'domain=transaction']);
    });
  });

  describe('handleTagFilterAdd', () => {
    it('should add a new tag when tag does not exist', () => {
      const { result } = renderHook(() =>
        useTagFilterHandlers(mockSetTagFilters, mockSetCurrentFilterType),
      );

      act(() => {
        result.current.handleTagFilterAdd('new-tag=value');
      });

      expect(mockSetTagFilters).toHaveBeenCalledWith(expect.any(Function));

      const setTagFiltersCallback = mockSetTagFilters.mock.calls[0][0];
      const resultTags = setTagFiltersCallback(['existing-tag=value']);
      expect(resultTags).toEqual(['existing-tag=value', 'new-tag=value']);
    });

    it('should not add duplicate tags', () => {
      const { result } = renderHook(() =>
        useTagFilterHandlers(mockSetTagFilters, mockSetCurrentFilterType),
      );

      act(() => {
        result.current.handleTagFilterAdd('domain=transaction');
      });

      act(() => {
        result.current.handleTagFilterAdd('domain=transaction');
      });

      expect(mockSetTagFilters).toHaveBeenCalledTimes(2);

      const firstCallback = mockSetTagFilters.mock.calls[0][0];
      const firstResult = firstCallback(['cardinality=high']);
      expect(firstResult).toEqual(['cardinality=high', 'domain=transaction']);

      const secondCallback = mockSetTagFilters.mock.calls[1][0];
      const secondResult = secondCallback(['cardinality=high', 'domain=transaction']);
      expect(secondResult).toEqual(['cardinality=high', 'domain=transaction']);
    });
  });

  describe('handleFilterTypeChange', () => {
    it('should call setCurrentFilterType with the provided filter type', () => {
      const { result } = renderHook(() =>
        useTagFilterHandlers(mockSetTagFilters, mockSetCurrentFilterType),
      );

      act(() => {
        result.current.handleFilterTypeChange('entity');
      });

      expect(mockSetCurrentFilterType).toHaveBeenCalledWith('entity');
    });

    it('should not call setCurrentFilterType when it is not provided', () => {
      const { result } = renderHook(() => useTagFilterHandlers(mockSetTagFilters));

      act(() => {
        result.current.handleFilterTypeChange('entity');
      });

      expect(mockSetCurrentFilterType).not.toHaveBeenCalled();
    });

    it('should handle different filter types', () => {
      const { result } = renderHook(() =>
        useTagFilterHandlers(mockSetTagFilters, mockSetCurrentFilterType),
      );

      act(() => {
        result.current.handleFilterTypeChange('featureView');
      });

      expect(mockSetCurrentFilterType).toHaveBeenCalledWith('featureView');
    });
  });

  describe('hook behavior', () => {
    it('should return stable function references between renders when dependencies do not change', () => {
      const { result, rerender } = renderHook(() =>
        useTagFilterHandlers(mockSetTagFilters, mockSetCurrentFilterType),
      );

      const firstRender = result.current;

      rerender();

      const secondRender = result.current;

      expect(firstRender.handleTagClick).toBe(secondRender.handleTagClick);
      expect(firstRender.handleTagFilterRemove).toBe(secondRender.handleTagFilterRemove);
      expect(firstRender.handleTagFilterAdd).toBe(secondRender.handleTagFilterAdd);
      expect(firstRender.handleFilterTypeChange).toBe(secondRender.handleFilterTypeChange);
    });

    it('should return new function references when dependencies change', () => {
      const { result, rerender } = renderHook(
        ({ setTagFilters, setCurrentFilterType }) =>
          useTagFilterHandlers(setTagFilters, setCurrentFilterType),
        {
          initialProps: {
            setTagFilters: mockSetTagFilters,
            setCurrentFilterType: mockSetCurrentFilterType,
          },
        },
      );

      const firstRender = result.current;

      const newMockSetTagFilters = jest.fn();
      rerender({
        setTagFilters: newMockSetTagFilters,
        setCurrentFilterType: mockSetCurrentFilterType,
      });

      const secondRender = result.current;

      expect(firstRender.handleTagClick).not.toBe(secondRender.handleTagClick);
      expect(firstRender.handleTagFilterRemove).not.toBe(secondRender.handleTagFilterRemove);
      expect(firstRender.handleTagFilterAdd).not.toBe(secondRender.handleTagFilterAdd);
      expect(firstRender.handleFilterTypeChange).toBe(secondRender.handleFilterTypeChange);
    });
  });
});
