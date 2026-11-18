import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { mockFeature } from '../../../__mocks__/mockFeatures';
import { Features } from '../../../types/features';
import FeaturesTable from '../FeaturesTable';

const renderTable = ({
  features = [mockFeature()],
  fsProject,
  onClearFilters = jest.fn(),
}: {
  features?: Features[];
  fsProject?: string;
  onClearFilters?: jest.Mock;
} = {}) =>
  render(
    <MemoryRouter>
      <FeaturesTable
        features={features}
        fsProject={fsProject}
        onClearFilters={onClearFilters}
        toolbarContent={<div data-testid="toolbar" />}
      />
    </MemoryRouter>,
  );

const feature = (name: string, featureView: string, project: string): Features =>
  mockFeature({ name, featureView, project, tags: {} });

describe('FeaturesTable', () => {
  it('renders one row per feature', () => {
    renderTable({
      features: [
        feature('city', 'zipcode_features', 'p1'),
        feature('state', 'zipcode_features', 'p1'),
      ],
    });

    expect(screen.getByRole('link', { name: 'city' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'state' })).toBeInTheDocument();
    expect(screen.getAllByRole('cell', { name: 'zipcode_features' })).toHaveLength(2);
  });

  it('renders the feature columns', () => {
    renderTable();

    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Feature store' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Tags' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Value type' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Feature view' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Owner' })).toBeInTheDocument();
  });

  it('prefers the feature store project from the table over the feature project', () => {
    renderTable({
      features: [feature('city', 'zipcode_features', 'feature-project')],
      fsProject: 'table-project',
    });

    expect(screen.getByRole('link', { name: 'city' })).toHaveAttribute(
      'href',
      '/develop-train/feature-store/features/table-project/zipcode_features/city',
    );
  });

  it('renders the empty state and clears filters when there are no features', async () => {
    const user = userEvent.setup();
    const onClearFilters = jest.fn();
    renderTable({ features: [], onClearFilters });

    expect(screen.getByTestId('dashboard-empty-table-state')).toHaveTextContent('No results found');

    await user.click(screen.getByTestId('clear-filters-button'));
    expect(onClearFilters).toHaveBeenCalled();
  });
});
