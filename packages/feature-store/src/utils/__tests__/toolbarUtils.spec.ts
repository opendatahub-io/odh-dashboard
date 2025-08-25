import {
  buildFilterLabel,
  buildFilterLabelList,
  handleLabelDelete,
  getFilterOptionProps,
} from '../toolbarUtils';
import { FilterData, MultipleLabels, OnFilterUpdate } from '../../types/toolbarTypes';

describe('toolbarUtils', () => {
  describe('buildFilterLabel', () => {
    it('should create a filter label with key and node', () => {
      const result = buildFilterLabel('entity', 'test-entity');

      expect(result).toEqual({
        key: 'entity',
        node: 'test-entity',
      });
    });

    it('should include testId in props when provided', () => {
      const result = buildFilterLabel('entity', 'test-entity', 'entity-filter');

      expect(result).toEqual({
        key: 'entity',
        node: 'test-entity',
        props: {
          'data-testid': 'entity-filter',
        },
      });
    });

    it('should not include props when testId is not provided', () => {
      const result = buildFilterLabel('entity', 'test-entity');

      expect(result).not.toHaveProperty('props');
    });
  });

  describe('buildFilterLabelList', () => {
    const mockFilterData: FilterData<'entity' | 'project' | 'tag'> = {
      entity: 'test-entity',
      project: { label: 'Test Project', value: 'test-project' },
      tag: undefined, // No main tag filter applied
    };

    it('should build filter label list with string data (entity filter)', () => {
      const result = buildFilterLabelList('entity', mockFilterData);

      expect(result).toEqual([{ key: 'entity', node: 'test-entity' }]);
    });

    it('should build filter label list with object data (project filter)', () => {
      const result = buildFilterLabelList('project', mockFilterData);

      expect(result).toEqual([{ key: 'project', node: 'Test Project' }]);
    });

    it('should build filter label list with multiple tags only', () => {
      const mockMultipleLabels: MultipleLabels<'tag'> = {
        tag: [
          { key: 'tag-0', label: 'environment=production', onRemove: jest.fn() },
          { key: 'tag-1', label: 'team=ml', onRemove: jest.fn() },
        ],
      };

      const result = buildFilterLabelList('tag', mockFilterData, mockMultipleLabels);

      expect(result).toEqual([
        { key: 'tag-0', node: 'environment=production' },
        { key: 'tag-1', node: 'team=ml' },
      ]);
    });

    it('should handle undefined filter data', () => {
      const mockMultipleLabels: MultipleLabels<'tag'> = {
        tag: [
          { key: 'tag-0', label: 'environment=production', onRemove: jest.fn() },
          { key: 'tag-1', label: 'team=ml', onRemove: jest.fn() },
        ],
      };

      const result = buildFilterLabelList('tag', mockFilterData, mockMultipleLabels);

      expect(result).toEqual([
        { key: 'tag-0', node: 'environment=production' },
        { key: 'tag-1', node: 'team=ml' },
      ]);
    });

    it('should handle empty multiple labels', () => {
      const result = buildFilterLabelList('entity', mockFilterData, {} as MultipleLabels<'entity'>);

      expect(result).toEqual([{ key: 'entity', node: 'test-entity' }]);
    });

    it('should handle undefined multiple labels', () => {
      const result = buildFilterLabelList('entity', mockFilterData);

      expect(result).toEqual([{ key: 'entity', node: 'test-entity' }]);
    });

    it('should handle empty string data', () => {
      const filterDataWithEmpty: FilterData<'entity'> = {
        entity: '',
      };

      const result = buildFilterLabelList('entity', filterDataWithEmpty);

      expect(result).toEqual([]);
    });

    it('should handle single-value filter with no tags', () => {
      const result = buildFilterLabelList('project', mockFilterData);

      expect(result).toEqual([{ key: 'project', node: 'Test Project' }]);
    });
  });

  describe('handleLabelDelete', () => {
    const mockOnFilterUpdate: OnFilterUpdate<'entity' | 'project' | 'tag'> = jest.fn();
    const mockMultipleLabels = [
      { key: 'tag-0', onRemove: jest.fn() },
      { key: 'tag-1', onRemove: jest.fn() },
    ];

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should handle string label deletion by clearing filter', () => {
      handleLabelDelete('entity', 'entity', mockMultipleLabels, mockOnFilterUpdate);

      expect(mockOnFilterUpdate).toHaveBeenCalledWith('entity', '');
    });

    it('should handle object label deletion for main filter', () => {
      handleLabelDelete({ key: 'entity' }, 'entity', mockMultipleLabels, mockOnFilterUpdate);

      expect(mockOnFilterUpdate).toHaveBeenCalledWith('entity', '');
    });

    it('should handle object label deletion for specific tag', () => {
      handleLabelDelete({ key: 'tag-0' }, 'tag', mockMultipleLabels, mockOnFilterUpdate);

      expect(mockMultipleLabels[0].onRemove).toHaveBeenCalled();
      expect(mockOnFilterUpdate).not.toHaveBeenCalled();
    });

    it('should handle object label deletion for non-existent tag', () => {
      handleLabelDelete({ key: 'nonexistent-tag' }, 'tag', mockMultipleLabels, mockOnFilterUpdate);

      expect(mockOnFilterUpdate).not.toHaveBeenCalled();
      expect(mockMultipleLabels[0].onRemove).not.toHaveBeenCalled();
      expect(mockMultipleLabels[1].onRemove).not.toHaveBeenCalled();
    });

    it('should handle empty multiple labels array', () => {
      handleLabelDelete({ key: 'tag-0' }, 'tag', [], mockOnFilterUpdate);

      expect(mockOnFilterUpdate).not.toHaveBeenCalled();
    });
  });

  describe('getFilterOptionProps', () => {
    const mockOnFilterUpdate: OnFilterUpdate<'entity' | 'project' | 'tag'> = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should create props with string filter item (entity filter)', () => {
      const result = getFilterOptionProps('entity', 'test-entity', mockOnFilterUpdate);

      expect(result).toEqual({
        onChange: expect.any(Function),
        value: 'test-entity',
      });
    });

    it('should create props with object filter item (project filter)', () => {
      const filterItem = { label: 'Test Project', value: 'test-project' };
      const result = getFilterOptionProps('project', filterItem, mockOnFilterUpdate);

      expect(result).toEqual({
        onChange: expect.any(Function),
        label: 'Test Project',
        value: 'test-project',
      });
    });

    it('should create props with undefined filter item', () => {
      const result = getFilterOptionProps('tag', undefined, mockOnFilterUpdate);

      expect(result).toEqual({
        onChange: expect.any(Function),
      });
    });

    it('should create onChange function that calls onFilterUpdate with string value', () => {
      const result = getFilterOptionProps('entity', 'test-entity', mockOnFilterUpdate);

      result.onChange('new-entity');

      expect(mockOnFilterUpdate).toHaveBeenCalledWith('entity', 'new-entity');
    });

    it('should create onChange function that calls onFilterUpdate with object value', () => {
      const result = getFilterOptionProps('project', 'test-project', mockOnFilterUpdate);

      result.onChange('new-project', 'New Project');

      expect(mockOnFilterUpdate).toHaveBeenCalledWith('project', {
        label: 'New Project',
        value: 'new-project',
      });
    });

    it('should create onChange function that calls onFilterUpdate with undefined value', () => {
      const result = getFilterOptionProps('entity', 'test-entity', mockOnFilterUpdate);

      result.onChange();

      expect(mockOnFilterUpdate).toHaveBeenCalledWith('entity', undefined);
    });

    it('should create onChange function that calls onFilterUpdate with only value (no label)', () => {
      const result = getFilterOptionProps('entity', 'test-entity', mockOnFilterUpdate);

      result.onChange('new-entity', '');

      expect(mockOnFilterUpdate).toHaveBeenCalledWith('entity', 'new-entity');
    });
  });
});
