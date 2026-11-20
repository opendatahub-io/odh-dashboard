import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { mockFeatureService } from '../../../__mocks__/mockFeatureServices';
import { FeatureService } from '../../../types/featureServices';
import FeatureServicesTable from '../FeatureServicesTable';

const renderTable = ({
  featureServices = [mockFeatureService({ name: 'credit_scoring_service' })],
  fsProject,
  onClearFilters = jest.fn(),
}: {
  featureServices?: FeatureService[];
  fsProject?: string;
  onClearFilters?: jest.Mock;
} = {}) =>
  render(
    <MemoryRouter>
      <FeatureServicesTable
        featureServices={featureServices}
        fsProject={fsProject}
        onClearFilters={onClearFilters}
        onTagClick={jest.fn()}
        toolbarContent={<div data-testid="toolbar" />}
      />
    </MemoryRouter>,
  );

describe('FeatureServicesTable', () => {
  it('renders one row per feature service', () => {
    renderTable({
      featureServices: [
        mockFeatureService({ name: 'credit_scoring_service' }),
        mockFeatureService({ name: 'driver_activity' }),
      ],
    });

    expect(screen.getByRole('link', { name: 'credit_scoring_service' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'driver_activity' })).toBeInTheDocument();
  });

  it('renders the feature service columns', () => {
    renderTable();

    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Feature store' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Tags' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Feature views' })).toBeInTheDocument();
  });

  it('links feature services using the feature store project from the table', () => {
    renderTable({
      featureServices: [
        mockFeatureService({ name: 'credit_scoring_service', project: 'service-project' }),
      ],
      fsProject: 'credit_scoring_local',
    });

    expect(screen.getByRole('link', { name: 'credit_scoring_service' })).toHaveAttribute(
      'href',
      '/develop-train/feature-store/feature-services/credit_scoring_local/credit_scoring_service',
    );
  });

  it('renders the empty state and clears filters when there are no feature services', async () => {
    const user = userEvent.setup();
    const onClearFilters = jest.fn();
    renderTable({ featureServices: [], onClearFilters });

    expect(screen.getByTestId('dashboard-empty-table-state')).toHaveTextContent('No results found');

    await user.click(screen.getByTestId('clear-filters-button'));
    expect(onClearFilters).toHaveBeenCalled();
  });
});
