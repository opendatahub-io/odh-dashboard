/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import useFeatureStoreProjects from '../../../apiHooks/useFeatureStoreProjects';
import { FeatureStoreObject } from '../../../const';
import FeatureStoreProjectSelector from '../FeatureStoreProjectSelector';

jest.mock('../../../apiHooks/useFeatureStoreProjects');

const mockUseFeatureStoreProjects = jest.mocked(useFeatureStoreProjects);

const projectList = (names: string[]) => ({
  data: {
    projects: names.map((name) => ({
      spec: { name },
      meta: {
        createdTimestamp: '2025-01-01T00:00:00Z',
        lastUpdatedTimestamp: '2025-01-01T00:00:00Z',
      },
    })),
    pagination: {
      page: 1,
      limit: 10,
      total_count: names.length,
      total_pages: 1,
      has_next: false,
      has_previous: false,
    },
  },
  loaded: true,
  error: undefined,
  refresh: jest.fn(),
});

const renderSelector = ({
  featureStoreProject = '',
  onSelection = jest.fn(),
}: { featureStoreProject?: string; onSelection?: jest.Mock } = {}) =>
  render(
    <FeatureStoreProjectSelector
      featureStoreProject={featureStoreProject}
      featureStoreObject={FeatureStoreObject.ENTITIES}
      onSelection={onSelection}
    />,
  );

describe('FeatureStoreProjectSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFeatureStoreProjects.mockReturnValue(
      projectList(['credit_scoring_local', 'driver_ranking']),
    );
  });

  it('labels the selectors and shows "All feature stores" when no project is selected', () => {
    renderSelector();

    expect(screen.getByText('Feature store')).toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: /All feature stores/ });
    expect(toggle).toHaveTextContent('All feature stores');
    expect(toggle).toHaveAccessibleName('Feature store All feature stores');
  });

  it('shows the selected project name in the toggle', () => {
    renderSelector({ featureStoreProject: 'driver_ranking' });

    const toggle = screen.getByRole('button', { name: /driver_ranking/ });
    expect(toggle).toHaveTextContent('driver_ranking');
    expect(toggle).toHaveAccessibleName('Feature store driver_ranking');
  });

  it('lists every available project in the menu', async () => {
    const user = userEvent.setup();
    renderSelector();

    await user.click(screen.getByTestId('feature-store-project-selector-toggle'));

    expect(screen.getByRole('menuitem', { name: 'credit_scoring_local' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'driver_ranking' })).toBeInTheDocument();
  });

  it('filters the project list by the search text', async () => {
    const user = userEvent.setup();
    renderSelector();

    await user.click(screen.getByTestId('feature-store-project-selector-toggle'));
    await user.type(screen.getByPlaceholderText('Feature store name'), 'driver');

    expect(screen.getByRole('menuitem', { name: 'driver_ranking' })).toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: 'credit_scoring_local' }),
    ).not.toBeInTheDocument();
  });

  it('calls onSelection with the object only when "All feature stores" is chosen', async () => {
    const user = userEvent.setup();
    const onSelection = jest.fn();
    renderSelector({ featureStoreProject: 'driver_ranking', onSelection });

    await user.click(screen.getByTestId('feature-store-project-selector-toggle'));
    await user.click(screen.getByRole('menuitem', { name: 'All feature stores' }));

    expect(onSelection).toHaveBeenCalledWith(FeatureStoreObject.ENTITIES);
  });

  it('calls onSelection with the chosen project', async () => {
    const user = userEvent.setup();
    const onSelection = jest.fn();
    renderSelector({ onSelection });

    await user.click(screen.getByTestId('feature-store-project-selector-toggle'));
    await user.click(screen.getByRole('menuitem', { name: 'driver_ranking' }));

    expect(onSelection).toHaveBeenCalledWith(FeatureStoreObject.ENTITIES, 'driver_ranking');
  });
});
