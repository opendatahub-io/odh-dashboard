import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { useFeatureStoreProject } from '../../../../FeatureStoreContext';
import { mockEntity } from '../../../../__mocks__/mockEntities';
import { Entity } from '../../../../types/entities';
import FeatureStoreEntitiesTable from '../FeatureStoreEntitiesTable';

jest.mock('../../../../FeatureStoreContext', () => ({
  useFeatureStoreProject: jest.fn(),
}));

const mockUseFeatureStoreProject = jest.mocked(useFeatureStoreProject);

const renderTable = ({
  entities = [mockEntity()],
  currentProject,
  onClearFilters = jest.fn(),
}: {
  entities?: Entity[];
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
      <FeatureStoreEntitiesTable
        entities={entities}
        relationships={{}}
        onClearFilters={onClearFilters}
        toolbarContent={<div data-testid="toolbar" />}
      />
    </MemoryRouter>,
  );
};

const entity = (name: string, project: string): Entity =>
  mockEntity({ spec: { name, description: `${name} description` }, project });

describe('FeatureStoreEntitiesTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders one row per entity', () => {
    renderTable({ entities: [entity('driver', 'p1'), entity('customer', 'p1')] });

    expect(screen.getByRole('link', { name: 'driver' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'customer' })).toBeInTheDocument();
  });

  it('renders the entity columns', () => {
    renderTable();

    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Feature store' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Tags' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Join key' })).toBeInTheDocument();
  });

  it('links entities to the active project', () => {
    renderTable({
      entities: [entity('driver', 'entity-project')],
      currentProject: 'active-project',
    });

    expect(screen.getByRole('link', { name: 'driver' })).toHaveAttribute(
      'href',
      '/develop-train/feature-store/entities/active-project/driver',
    );
  });

  it('falls back to the entity project when there is no active project', () => {
    renderTable({ entities: [entity('driver', 'entity-project')] });

    expect(screen.getByRole('link', { name: 'driver' })).toHaveAttribute(
      'href',
      '/develop-train/feature-store/entities/entity-project/driver',
    );
  });

  it('renders the empty state and clears filters when there are no entities', async () => {
    const user = userEvent.setup();
    const onClearFilters = jest.fn();
    renderTable({ entities: [], onClearFilters });

    expect(screen.getByTestId('dashboard-empty-table-state')).toHaveTextContent('No results found');

    await user.click(screen.getByTestId('clear-filters-button'));
    expect(onClearFilters).toHaveBeenCalled();
  });
});
