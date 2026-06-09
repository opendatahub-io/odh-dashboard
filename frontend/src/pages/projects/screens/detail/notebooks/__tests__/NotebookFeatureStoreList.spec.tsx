import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockNotebookK8sResource } from '#~/__mocks__/mockNotebookK8sResource';
import NotebookFeatureStoreList from '#~/pages/projects/screens/detail/notebooks/NotebookFeatureStoreList';
import { FEAST_CONFIG_ANNOTATION } from '#~/pages/projects/screens/spawner/featureStore/const';

const FIVE_STORES = 'store-1,store-2,store-3,store-4,store-5';
const SIX_STORES = `${FIVE_STORES},store-6`;
const SEVEN_STORES = `${SIX_STORES},store-7`;
const THREE_PROJECTS = 'project-a,project-b,project-c';
const DUPLICATED_PROJECTS = 'project-a,project-b,project-a,project-c,project-b';
const WHITESPACE_PADDED = '  project-a , project-b , project-c  ';
const WHITESPACE_ONLY = '   ,  , ';

const renderFeatureStoreList = (
  annotation?: string,
  availableNames: Set<string> = new Set(),
  availabilityLoaded = true,
) => {
  const notebook = mockNotebookK8sResource({
    ...(annotation !== undefined && {
      opts: {
        metadata: {
          annotations: { [FEAST_CONFIG_ANNOTATION]: annotation },
        },
      },
    }),
  });
  render(
    <NotebookFeatureStoreList
      notebook={notebook}
      availableNames={availableNames}
      availabilityLoaded={availabilityLoaded}
    />,
  );
};

describe('NotebookFeatureStoreList', () => {
  it('should display the section title', () => {
    renderFeatureStoreList();
    expect(screen.getByTestId('notebook-feature-store-title')).toHaveTextContent(
      'Connected feature stores',
    );
  });

  it('should show "None" when annotation is absent', () => {
    renderFeatureStoreList();
    expect(screen.getByTestId('notebook-feature-store-none')).toHaveTextContent('None');
  });

  it('should show "None" when annotation is empty', () => {
    renderFeatureStoreList('');
    expect(screen.getByTestId('notebook-feature-store-none')).toHaveTextContent('None');
  });

  it('should show "None" when annotation contains only whitespace/commas', () => {
    renderFeatureStoreList(WHITESPACE_ONLY);
    expect(screen.getByTestId('notebook-feature-store-none')).toHaveTextContent('None');
  });

  it('should render a single feature store', () => {
    renderFeatureStoreList('single-project', new Set(['single-project']));

    const list = screen.getByTestId('notebook-feature-store-list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(within(list).getByText('single-project')).toBeInTheDocument();
    expect(screen.queryByTestId('feature-store-show-all')).not.toBeInTheDocument();
  });

  it('should render 3 feature store names without expand button', () => {
    renderFeatureStoreList(THREE_PROJECTS, new Set(['project-a', 'project-b', 'project-c']));

    const list = screen.getByTestId('notebook-feature-store-list');
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('project-a');
    expect(items[1]).toHaveTextContent('project-b');
    expect(items[2]).toHaveTextContent('project-c');
    expect(screen.queryByTestId('feature-store-show-all')).not.toBeInTheDocument();
  });

  it('should not show expand button for exactly 5 items', () => {
    renderFeatureStoreList(FIVE_STORES);

    const list = screen.getByTestId('notebook-feature-store-list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(5);
    expect(screen.queryByTestId('feature-store-show-all')).not.toBeInTheDocument();
  });

  it('should show "1 more" for exactly 6 items', () => {
    renderFeatureStoreList(SIX_STORES);

    const list = screen.getByTestId('notebook-feature-store-list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(5);

    const showAllContainer = screen.getByTestId('feature-store-show-all');
    expect(showAllContainer).toHaveTextContent('Show all');
    expect(showAllContainer).toHaveTextContent('1 more');
  });

  it('should expand and collapse for 7 items', async () => {
    const user = userEvent.setup();
    renderFeatureStoreList(SEVEN_STORES);

    const list = screen.getByTestId('notebook-feature-store-list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(5);

    const showAllContainer = screen.getByTestId('feature-store-show-all');
    expect(showAllContainer).toHaveTextContent('Show all');
    expect(showAllContainer).toHaveTextContent('2 more');

    await user.click(within(showAllContainer).getByRole('button'));
    expect(within(list).getAllByRole('listitem')).toHaveLength(7);
    expect(showAllContainer).toHaveTextContent('Show less');

    await user.click(within(showAllContainer).getByRole('button'));
    expect(within(list).getAllByRole('listitem')).toHaveLength(5);
    expect(showAllContainer).toHaveTextContent('Show all');
  });

  it('should trim whitespace from comma-separated values', () => {
    renderFeatureStoreList(WHITESPACE_PADDED, new Set(['project-a', 'project-b', 'project-c']));

    const list = screen.getByTestId('notebook-feature-store-list');
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('project-a');
    expect(items[1]).toHaveTextContent('project-b');
    expect(items[2]).toHaveTextContent('project-c');
  });

  it('should deduplicate feature store names while preserving order', () => {
    renderFeatureStoreList(DUPLICATED_PROJECTS, new Set(['project-a', 'project-b', 'project-c']));

    const list = screen.getByTestId('notebook-feature-store-list');
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('project-a');
    expect(items[1]).toHaveTextContent('project-b');
    expect(items[2]).toHaveTextContent('project-c');
  });

  describe('availability indicators', () => {
    it('should show warning icon for unavailable feature stores', () => {
      renderFeatureStoreList('project-a,project-b,project-c', new Set(['project-a']));

      const list = screen.getByTestId('notebook-feature-store-list');
      const items = within(list).getAllByRole('listitem');

      expect(
        within(items[0]).queryByTestId('feature-store-unavailable-icon'),
      ).not.toBeInTheDocument();
      expect(within(items[1]).getByTestId('feature-store-unavailable-icon')).toBeInTheDocument();
      expect(within(items[2]).getByTestId('feature-store-unavailable-icon')).toBeInTheDocument();
    });

    it('should not show warning icons when all stores are available', () => {
      renderFeatureStoreList(THREE_PROJECTS, new Set(['project-a', 'project-b', 'project-c']));
      expect(screen.queryAllByTestId('feature-store-unavailable-icon')).toHaveLength(0);
    });

    it('should show warning icons for all stores when none are available', () => {
      renderFeatureStoreList(THREE_PROJECTS, new Set());
      expect(screen.getAllByTestId('feature-store-unavailable-icon')).toHaveLength(3);
    });

    it('should not show warning icons while availability is still loading', () => {
      renderFeatureStoreList(THREE_PROJECTS, new Set(), false);

      expect(screen.queryAllByTestId('feature-store-unavailable-icon')).toHaveLength(0);
      const list = screen.getByTestId('notebook-feature-store-list');
      expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    });

    it('should preserve ordering with mixed available/unavailable stores', () => {
      renderFeatureStoreList('project-a,project-b,project-c', new Set(['project-b']));

      const list = screen.getByTestId('notebook-feature-store-list');
      const items = within(list).getAllByRole('listitem');
      expect(items).toHaveLength(3);
      expect(items[0]).toHaveTextContent('project-a');
      expect(items[1]).toHaveTextContent('project-b');
      expect(items[2]).toHaveTextContent('project-c');

      expect(within(items[0]).getByTestId('feature-store-unavailable-icon')).toBeInTheDocument();
      expect(
        within(items[1]).queryByTestId('feature-store-unavailable-icon'),
      ).not.toBeInTheDocument();
      expect(within(items[2]).getByTestId('feature-store-unavailable-icon')).toBeInTheDocument();
    });

    it('should show warning icons with expand/collapse for mixed stores', async () => {
      const user = userEvent.setup();
      renderFeatureStoreList(SEVEN_STORES, new Set(['store-1', 'store-3', 'store-5']));

      const list = screen.getByTestId('notebook-feature-store-list');
      const initialItems = within(list).getAllByRole('listitem');
      expect(initialItems).toHaveLength(5);

      expect(
        within(initialItems[0]).queryByTestId('feature-store-unavailable-icon'),
      ).not.toBeInTheDocument();
      expect(
        within(initialItems[1]).getByTestId('feature-store-unavailable-icon'),
      ).toBeInTheDocument();

      const showAllContainer = screen.getByTestId('feature-store-show-all');
      await user.click(within(showAllContainer).getByRole('button'));

      const allItems = within(list).getAllByRole('listitem');
      expect(allItems).toHaveLength(7);
      expect(within(allItems[5]).getByTestId('feature-store-unavailable-icon')).toBeInTheDocument();
      expect(within(allItems[6]).getByTestId('feature-store-unavailable-icon')).toBeInTheDocument();
    });
  });
});
