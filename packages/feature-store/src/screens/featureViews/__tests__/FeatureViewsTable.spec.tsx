import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { useFeatureStoreProject } from '../../../FeatureStoreContext';
import { mockFeatureView } from '../../../__mocks__/mockFeatureViews';
import { FeatureView } from '../../../types/featureView';
import FeatureViewsTable from '../FeatureViewsTable';

jest.mock('../../../FeatureStoreContext', () => ({
  useFeatureStoreProject: jest.fn(),
}));

const mockUseFeatureStoreProject = jest.mocked(useFeatureStoreProject);

const renderTable = ({
  featureViews = [
    mockFeatureView({ spec: { ...mockFeatureView().spec, name: 'zipcode_features' } }),
  ],
  isFromDetailsPage = false,
  fsObject,
  fsProject = 'credit_scoring_local',
  onClearFilters = jest.fn(),
}: {
  featureViews?: FeatureView[];
  isFromDetailsPage?: boolean;
  fsObject?: { entity?: string; feature?: string; featureService?: string };
  fsProject?: string;
  onClearFilters?: jest.Mock;
} = {}) => {
  mockUseFeatureStoreProject.mockReturnValue({
    currentProject: 'credit_scoring_local',
    setCurrentProject: jest.fn(),
    preferredFeatureStoreProject: null,
    updatePreferredFeatureStoreProject: jest.fn(),
  });

  return render(
    <MemoryRouter>
      <FeatureViewsTable
        featureViews={featureViews}
        relationships={{}}
        onClearFilters={onClearFilters}
        fsProject={fsProject}
        onTagClick={jest.fn()}
        isFromDetailsPage={isFromDetailsPage}
        fsObject={fsObject}
        toolbarContent={<div data-testid="toolbar" />}
      />
    </MemoryRouter>,
  );
};

const featureView = (name: string): FeatureView => {
  const base = mockFeatureView();
  return mockFeatureView({ spec: { ...base.spec, name } });
};

describe('FeatureViewsTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders one row per feature view', () => {
    renderTable({ featureViews: [featureView('zipcode_features'), featureView('driver_stats')] });

    expect(screen.getByRole('link', { name: 'zipcode_features' })).toHaveAttribute(
      'href',
      '/develop-train/feature-store/feature-views/credit_scoring_local/zipcode_features',
    );
    expect(screen.getByRole('link', { name: 'driver_stats' })).toHaveAttribute(
      'href',
      '/develop-train/feature-store/feature-views/credit_scoring_local/driver_stats',
    );
  });

  it('hides the feature services column in the browse table', () => {
    renderTable();

    expect(screen.getByRole('columnheader', { name: 'Features' })).toBeInTheDocument();
    // Positive control for the details-page assertion below: the column exists, since
    // the details mode only renders a whitelist of columns that excludes it.
    expect(screen.getByRole('columnheader', { name: 'Feature store' })).toBeInTheDocument();
    expect(
      screen.queryByRole('columnheader', { name: 'Feature services' }),
    ).not.toBeInTheDocument();
  });

  it('keeps the feature services column and drops features on a feature details page', () => {
    renderTable({ isFromDetailsPage: true, fsObject: { feature: 'city' } });

    expect(screen.queryByRole('columnheader', { name: 'Features' })).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Feature services' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Tags' })).toBeInTheDocument();
  });

  it('drops the feature services column on a feature service details page', () => {
    renderTable({ isFromDetailsPage: true, fsObject: { featureService: 'credit_service' } });

    expect(
      screen.queryByRole('columnheader', { name: 'Feature services' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Features' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Feature store' })).not.toBeInTheDocument();
  });

  it('renders the empty state and clears filters when there are no feature views', async () => {
    const user = userEvent.setup();
    const onClearFilters = jest.fn();
    renderTable({ featureViews: [], onClearFilters });

    expect(screen.getByTestId('dashboard-empty-table-state')).toHaveTextContent('No results found');

    await user.click(screen.getByTestId('clear-filters-button'));
    expect(onClearFilters).toHaveBeenCalled();
  });
});
