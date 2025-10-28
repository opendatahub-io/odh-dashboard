import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ModelsListToolbar from '~/app/AIAssets/components/ModelsListToolbar';
import { AssetsFilterColors, AssetsFilterOptions } from '~/app/AIAssets/data/filterOptions';

describe('ModelsListToolbar', () => {
  const defaultProps = {
    onFilterUpdate: jest.fn(),
    filterData: {},
    filterOptions: {
      [AssetsFilterOptions.NAME]: 'Name',
      [AssetsFilterOptions.KEYWORD]: 'Keyword',
    },
    onClearFilters: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the toolbar', () => {
    render(<ModelsListToolbar {...defaultProps} />);

    expect(screen.getByTestId('models-table-toolbar')).toBeInTheDocument();
  });

  it('should render filter dropdown with default filter type', () => {
    render(<ModelsListToolbar {...defaultProps} />);

    expect(screen.getByText('Name')).toBeInTheDocument();
  });

  it('should render search input', () => {
    render(<ModelsListToolbar {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Filter by name...');
    expect(searchInput).toBeInTheDocument();
  });

  describe('Filter dropdown', () => {
    it('should open dropdown when toggle is clicked', async () => {
      const user = userEvent.setup();
      render(<ModelsListToolbar {...defaultProps} />);

      const filterToggle = screen.getByLabelText('Filter toggle');
      await user.click(filterToggle);

      expect(screen.getByText('Keyword')).toBeInTheDocument();
    });

    it('should change filter type when dropdown item is clicked', async () => {
      const user = userEvent.setup();
      render(<ModelsListToolbar {...defaultProps} />);

      const filterToggle = screen.getByLabelText('Filter toggle');
      await user.click(filterToggle);

      const keywordOption = screen.getByText('Keyword');
      await user.click(keywordOption);

      expect(screen.getByPlaceholderText('Filter by keyword...')).toBeInTheDocument();
    });

    it('should display all filter options in dropdown', async () => {
      const user = userEvent.setup();
      const filterOptions = {
        [AssetsFilterOptions.NAME]: 'Name',
        [AssetsFilterOptions.KEYWORD]: 'Keyword',
        [AssetsFilterOptions.USE_CASE]: 'Use Case',
      };

      render(<ModelsListToolbar {...defaultProps} filterOptions={filterOptions} />);

      const filterToggle = screen.getByLabelText('Filter toggle');
      await user.click(filterToggle);

      // Check for dropdown items (not the toggle text)
      expect(screen.getByRole('menuitem', { name: 'Name' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Keyword' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Use Case' })).toBeInTheDocument();
    });
  });

  describe('Search functionality', () => {
    it('should update search value when typing', async () => {
      const user = userEvent.setup();
      render(<ModelsListToolbar {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Filter by name...');
      await user.type(searchInput, 'test model');

      expect(searchInput).toHaveValue('test model');
    });

    it('should call onFilterUpdate when search is submitted', async () => {
      const user = userEvent.setup();
      const mockOnFilterUpdate = jest.fn();
      render(<ModelsListToolbar {...defaultProps} onFilterUpdate={mockOnFilterUpdate} />);

      const searchInput = screen.getByPlaceholderText('Filter by name...');
      await user.type(searchInput, 'test model{Enter}');

      expect(mockOnFilterUpdate).toHaveBeenCalledWith(AssetsFilterOptions.NAME, 'test model');
    });

    it('should update placeholder based on selected filter type', async () => {
      const user = userEvent.setup();
      render(<ModelsListToolbar {...defaultProps} />);

      // Initially should show "Filter by name..."
      expect(screen.getByPlaceholderText('Filter by name...')).toBeInTheDocument();

      // Change to Keyword filter
      const filterToggle = screen.getByLabelText('Filter toggle');
      await user.click(filterToggle);

      const keywordOption = screen.getByText('Keyword');
      await user.click(keywordOption);

      // Should now show "Filter by keyword..."
      expect(screen.getByPlaceholderText('Filter by keyword...')).toBeInTheDocument();
    });
  });

  describe('Active filters', () => {
    it('should not show active filters section when no filters are applied', () => {
      render(<ModelsListToolbar {...defaultProps} />);

      expect(screen.queryByText('Active filters:')).not.toBeInTheDocument();
    });

    it('should show active filters when filters are applied', () => {
      const filterData = {
        [AssetsFilterOptions.NAME]: 'test model',
      };

      render(<ModelsListToolbar {...defaultProps} filterData={filterData} />);

      expect(screen.getByText('Active filters:')).toBeInTheDocument();
      expect(screen.getByText('Name: test model')).toBeInTheDocument();
    });

    it('should display multiple active filters', () => {
      const filterData = {
        [AssetsFilterOptions.NAME]: 'test model',
        [AssetsFilterOptions.KEYWORD]: 'llm',
      };

      render(<ModelsListToolbar {...defaultProps} filterData={filterData} />);

      expect(screen.getByText('Name: test model')).toBeInTheDocument();
      expect(screen.getByText('Keyword: llm')).toBeInTheDocument();
    });

    it('should call onClearFilters when "Clear all filters" is clicked', async () => {
      const user = userEvent.setup();
      const mockOnClearFilters = jest.fn();
      const filterData = {
        [AssetsFilterOptions.NAME]: 'test model',
      };

      render(
        <ModelsListToolbar
          {...defaultProps}
          filterData={filterData}
          onClearFilters={mockOnClearFilters}
        />,
      );

      const clearAllButton = screen.getByText('Clear all filters');
      await user.click(clearAllButton);

      expect(mockOnClearFilters).toHaveBeenCalled();
    });

    it('should apply correct label colors based on filter type', () => {
      const filterData = {
        [AssetsFilterOptions.NAME]: 'test',
        [AssetsFilterOptions.KEYWORD]: 'keyword',
      };

      const filterColors = {
        [AssetsFilterOptions.NAME]: AssetsFilterColors.NAME,
        [AssetsFilterOptions.KEYWORD]: AssetsFilterColors.KEYWORD,
      };

      render(
        <ModelsListToolbar {...defaultProps} filterData={filterData} filterColors={filterColors} />,
      );

      expect(screen.getByText('Name: test')).toBeInTheDocument();
      expect(screen.getByText('Keyword: keyword')).toBeInTheDocument();
    });
  });

  describe('Info popover', () => {
    it('should render info popover when provided', () => {
      const infoPopover = <div data-testid="info-popover">Info content</div>;

      render(<ModelsListToolbar {...defaultProps} infoPopover={infoPopover} />);

      expect(screen.getByTestId('info-popover')).toBeInTheDocument();
    });

    it('should not render info popover section when not provided', () => {
      render(<ModelsListToolbar {...defaultProps} />);

      expect(screen.queryByTestId('info-popover')).not.toBeInTheDocument();
    });
  });
});
