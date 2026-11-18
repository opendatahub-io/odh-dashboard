import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { useFeatureStoreProject } from '../../../../FeatureStoreContext';
import { mockDataSource } from '../../../../__mocks__/mockDataSources';
import { DataSource } from '../../../../types/dataSources';
import FeatureStoreDataSourceTable from '../FeatureStoreDataSourceTable';

jest.mock('../../../../FeatureStoreContext', () => ({
  useFeatureStoreProject: jest.fn(),
}));

const mockUseFeatureStoreProject = jest.mocked(useFeatureStoreProject);

const renderTable = ({
  dataSources = [mockDataSource()],
  currentProject,
  onClearFilters = jest.fn(),
}: {
  dataSources?: DataSource[];
  currentProject?: string;
  onClearFilters?: jest.Mock;
} = {}) => {
  mockUseFeatureStoreProject.mockReturnValue({
    currentProject,
    setCurrentProject: jest.fn(),
    preferredFeatureStoreProject: null,
    updatePreferredFeatureStoreProject: jest.fn(),
  });

  return render(
    <MemoryRouter>
      <FeatureStoreDataSourceTable
        dataSources={dataSources}
        relationships={{}}
        onClearFilters={onClearFilters}
        toolbarContent={<div data-testid="toolbar" />}
      />
    </MemoryRouter>,
  );
};

const dataSource = (name: string, project: string): DataSource =>
  mockDataSource({ name, description: `${name} description`, project });

describe('FeatureStoreDataSourceTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders one row per data source', () => {
    renderTable({ dataSources: [dataSource('loan_data', 'p1'), dataSource('user_data', 'p1')] });

    expect(screen.getByRole('link', { name: 'loan_data' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'user_data' })).toBeInTheDocument();
  });

  it('renders the data source columns', () => {
    renderTable();

    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Feature store' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Data source connector' })).toBeInTheDocument();
  });

  it('links data sources to the active project', () => {
    renderTable({
      dataSources: [dataSource('loan_data', 'source-project')],
      currentProject: 'active',
    });

    expect(screen.getByRole('link', { name: 'loan_data' })).toHaveAttribute(
      'href',
      '/develop-train/feature-store/data-sources/active/loan_data',
    );
  });

  it('renders the empty state and clears filters when there are no data sources', async () => {
    const user = userEvent.setup();
    const onClearFilters = jest.fn();
    renderTable({ dataSources: [], onClearFilters });

    expect(screen.getByTestId('dashboard-empty-table-state')).toHaveTextContent('No results found');

    await user.click(screen.getByTestId('clear-filters-button'));
    expect(onClearFilters).toHaveBeenCalled();
  });
});
