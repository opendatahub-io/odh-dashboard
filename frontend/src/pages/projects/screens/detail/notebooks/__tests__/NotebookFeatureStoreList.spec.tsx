import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockNotebookK8sResource } from '#~/__mocks__/mockNotebookK8sResource';
import NotebookFeatureStoreList from '#~/pages/projects/screens/detail/notebooks/NotebookFeatureStoreList';
import { FEAST_CONFIG_ANNOTATION } from '#~/pages/projects/screens/spawner/featureStore/const';

const SEVEN_STORES = 'store-1,store-2,store-3,store-4,store-5,store-6,store-7';

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
  it('should show title and "None" when annotation is absent or empty', () => {
    const { unmount } = render(
      <NotebookFeatureStoreList
        notebook={mockNotebookK8sResource({})}
        availableNames={new Set()}
        availabilityLoaded
      />,
    );
    expect(screen.getByTestId('notebook-feature-store-title')).toHaveTextContent(
      'Connected feature stores',
    );
    expect(screen.getByTestId('notebook-feature-store-none')).toHaveTextContent('None');
    unmount();

    renderFeatureStoreList('');
    expect(screen.getByTestId('notebook-feature-store-none')).toHaveTextContent('None');
  });

  it('should render deduplicated and trimmed names without expand button', () => {
    renderFeatureStoreList(
      '  project-a , project-b , project-a , project-c  ',
      new Set(['project-a', 'project-b', 'project-c']),
    );

    const list = screen.getByTestId('notebook-feature-store-list');
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('project-a');
    expect(items[1]).toHaveTextContent('project-b');
    expect(items[2]).toHaveTextContent('project-c');
    expect(screen.queryByTestId('feature-store-show-all')).not.toBeInTheDocument();
  });

  it('should expand and collapse for more than 5 items', async () => {
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

  it('should show info icon only for unavailable stores and hide icons while loading', () => {
    const { unmount } = render(
      <NotebookFeatureStoreList
        notebook={mockNotebookK8sResource({
          opts: {
            metadata: {
              annotations: { [FEAST_CONFIG_ANNOTATION]: 'project-a,project-b,project-c' },
            },
          },
        })}
        availableNames={new Set()}
        availabilityLoaded={false}
      />,
    );
    expect(screen.queryAllByTestId('feature-store-unavailable-icon')).toHaveLength(0);
    expect(
      within(screen.getByTestId('notebook-feature-store-list')).getAllByRole('listitem'),
    ).toHaveLength(3);
    unmount();

    renderFeatureStoreList('project-a,project-b,project-c', new Set(['project-b']));
    const list = screen.getByTestId('notebook-feature-store-list');
    const items = within(list).getAllByRole('listitem');
    expect(within(items[0]).getByTestId('feature-store-unavailable-icon')).toBeInTheDocument();
    expect(
      within(items[1]).queryByTestId('feature-store-unavailable-icon'),
    ).not.toBeInTheDocument();
    expect(within(items[2]).getByTestId('feature-store-unavailable-icon')).toBeInTheDocument();
  });

  it('should show info icons with expand/collapse for mixed stores', async () => {
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
