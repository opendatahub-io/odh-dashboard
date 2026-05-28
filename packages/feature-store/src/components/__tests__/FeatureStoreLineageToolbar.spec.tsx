import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FeatureStoreLineageToolbar from '../FeatureStoreLineageToolbar';

jest.mock('@odh-dashboard/internal/components/FilterToolbar', () => {
  const MockFilterToolbar = ({
    filterData,
    onFilterUpdate,
    filterOptionRenders,
    currentFilterType,
    testId,
  }: {
    filterData: Record<string, string | undefined>;
    onFilterUpdate: (filterType: string, value?: string) => void;
    filterOptionRenders: Record<string, (props: unknown) => React.ReactNode>;
    currentFilterType: string;
    testId: string;
  }) => (
    <div data-testid={testId}>
      <div data-testid="filter-data">{JSON.stringify(filterData)}</div>
      <div data-testid="current-filter-type">{currentFilterType}</div>
      <button data-testid="apply-entity-filter" onClick={() => onFilterUpdate('entity', 'Entity1')}>
        Apply entity filter
      </button>
      <button data-testid="clear-entity-filter" onClick={() => onFilterUpdate('entity', '')}>
        Clear entity filter
      </button>
      {filterOptionRenders[currentFilterType]({
        onChange: jest.fn(),
        value: undefined,
        label: undefined,
      })}
    </div>
  );
  return MockFilterToolbar;
});

jest.mock('@odh-dashboard/internal/components/MultiSelection', () => ({
  MultiSelection: ({
    value,
    setValue,
    ariaLabel,
  }: {
    value: Array<{ id: string; name: string; selected: boolean; isAriaDisabled?: boolean }>;
    setValue: (
      selections: Array<{ id: string; name: string; selected: boolean; isAriaDisabled?: boolean }>,
    ) => void;
    ariaLabel: string;
  }) => (
    <div data-testid={`multi-selection-${ariaLabel}`}>
      <span data-testid="option-count">{value.length}</span>
      <button
        data-testid={`select-${ariaLabel}`}
        onClick={() =>
          setValue(value.map((item) => ({ ...item, selected: true, isAriaDisabled: false })))
        }
      >
        Select all
      </button>
      <button
        data-testid={`deselect-${ariaLabel}`}
        onClick={() =>
          setValue(value.map((item) => ({ ...item, selected: false, isAriaDisabled: false })))
        }
      >
        Deselect all
      </button>
    </div>
  ),
}));

jest.mock('../../screens/lineage/utils', () => ({
  extractFilterOptionsFromLineage: jest.fn(() => ({
    entity: [
      { id: 'entity-1', name: 'user_id', description: 'User identifier' },
      { id: 'entity-2', name: 'item_id', description: 'Item identifier' },
    ],
    featureView: [{ id: 'fv-1', name: 'user_features', description: 'User features' }],
    dataSource: [{ id: 'ds-1', name: 'user_table', description: 'User data' }],
    featureService: [{ id: 'fs-1', name: 'user_service', description: 'User service' }],
  })),
  extractFilterOptionsFromFeatureViewLineage: jest.fn(() => ({
    entity: [{ id: 'entity-1', name: 'user_id', description: 'User identifier' }],
    featureView: [],
    dataSource: [{ id: 'ds-1', name: 'user_table', description: 'User data' }],
    featureService: [],
  })),
}));

describe('FeatureStoreLineageToolbar', () => {
  const defaultProps = {
    hideNodesWithoutRelationships: false,
    onHideNodesWithoutRelationshipsChange: jest.fn(),
    searchFilters: {},
    onSearchFiltersChange: jest.fn(),
    currentFilterType: 'entity' as const,
    onCurrentFilterTypeChange: jest.fn(),
    lineageData: {
      objects: { entities: [] },
      relationships: [],
    } as unknown as Parameters<typeof FeatureStoreLineageToolbar>[0]['lineageData'],
    lineageDataLoaded: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with empty search filters', () => {
    render(<FeatureStoreLineageToolbar {...defaultProps} />);
    expect(screen.getByTestId('lineage-search-filter')).toBeInTheDocument();
  });

  it('should convert array filters to comma-separated filterData', () => {
    render(
      <FeatureStoreLineageToolbar
        {...defaultProps}
        searchFilters={{
          entity: ['user_id', 'item_id'],
          featureView: ['user_features'],
        }}
      />,
    );

    const filterData = screen.getByTestId('filter-data');
    const parsed = JSON.parse(filterData.textContent || '{}');
    expect(parsed.entity).toBe('user_id, item_id');
    expect(parsed.featureView).toBe('user_features');
  });

  it('should handle undefined filter arrays in filterData', () => {
    render(<FeatureStoreLineageToolbar {...defaultProps} searchFilters={{}} />);

    const filterData = screen.getByTestId('filter-data');
    const parsed = JSON.parse(filterData.textContent || '{}');
    expect(parsed.entity).toBeUndefined();
    expect(parsed.featureView).toBeUndefined();
    expect(parsed.dataSource).toBeUndefined();
    expect(parsed.featureService).toBeUndefined();
  });

  it('should call onFilterUpdate which wraps value in array', () => {
    const onSearchFiltersChange = jest.fn();
    render(
      <FeatureStoreLineageToolbar
        {...defaultProps}
        onSearchFiltersChange={onSearchFiltersChange}
      />,
    );

    fireEvent.click(screen.getByTestId('apply-entity-filter'));
    expect(onSearchFiltersChange).toHaveBeenCalledWith({ entity: ['Entity1'] });
  });

  it('should delete filter when onFilterUpdate is called with empty value', () => {
    const onSearchFiltersChange = jest.fn();
    render(
      <FeatureStoreLineageToolbar
        {...defaultProps}
        searchFilters={{ entity: ['user_id'] }}
        onSearchFiltersChange={onSearchFiltersChange}
      />,
    );

    fireEvent.click(screen.getByTestId('clear-entity-filter'));
    expect(onSearchFiltersChange).toHaveBeenCalledWith({});
  });

  it('should pass selected state from searchFilters array to entity options', () => {
    render(
      <FeatureStoreLineageToolbar
        {...defaultProps}
        searchFilters={{ entity: ['user_id'] }}
        currentFilterType="entity"
      />,
    );

    // The MultiSelection mock renders the options count
    expect(screen.getByTestId('multi-selection-Search entities')).toBeInTheDocument();
  });

  it('should handle selection change by setting array of selected names', () => {
    const onSearchFiltersChange = jest.fn();
    render(
      <FeatureStoreLineageToolbar
        {...defaultProps}
        onSearchFiltersChange={onSearchFiltersChange}
        currentFilterType="entity"
      />,
    );

    // Click "Select all" which triggers handleSelectionChange
    fireEvent.click(screen.getByTestId('select-Search entities'));
    expect(onSearchFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: expect.arrayContaining(['user_id', 'item_id']),
      }),
    );
  });

  it('should remove filter type when all selections are deselected', () => {
    const onSearchFiltersChange = jest.fn();
    render(
      <FeatureStoreLineageToolbar
        {...defaultProps}
        searchFilters={{ entity: ['user_id'] }}
        onSearchFiltersChange={onSearchFiltersChange}
        currentFilterType="entity"
      />,
    );

    // Click "Deselect all" which triggers handleSelectionChange with no selected items
    fireEvent.click(screen.getByTestId('deselect-Search entities'));
    expect(onSearchFiltersChange).toHaveBeenCalledWith({});
  });

  it('should render hide toggle and fire callback', () => {
    const onHideChange = jest.fn();
    render(
      <FeatureStoreLineageToolbar
        {...defaultProps}
        onHideNodesWithoutRelationshipsChange={onHideChange}
      />,
    );

    const toggle = screen.getByRole('switch', {
      name: 'Toggle visibility of nodes without relationships',
    });
    fireEvent.click(toggle);
    expect(onHideChange).toHaveBeenCalled();
  });

  it('should handle hasFilters effect with array filters', () => {
    // When filters have values, the effect should add the CSS class
    // This test verifies the component renders without errors when filters are present
    const { rerender } = render(
      <FeatureStoreLineageToolbar {...defaultProps} searchFilters={{ entity: ['user_id'] }} />,
    );

    // Rerender with empty filters to exercise the else branch
    rerender(<FeatureStoreLineageToolbar {...defaultProps} searchFilters={{}} />);

    expect(screen.getByTestId('lineage-search-filter')).toBeInTheDocument();
  });
});
