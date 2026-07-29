import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { mockNotebookK8sResource } from '#~/__mocks__/mockNotebookK8sResource';
import NotebookFeatureStoreList from '#~/pages/projects/screens/detail/notebooks/NotebookFeatureStoreList';
import { FEAST_CONFIG_ANNOTATION } from '#~/pages/projects/screens/spawner/featureStore/const';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Link: ({
    to,
    state,
    children,
    ...rest
  }: {
    to: string;
    state?: Record<string, unknown>;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={to} data-state={JSON.stringify(state)} {...rest}>
      {children}
    </a>
  ),
}));

const SEVEN_STORES = 'store-1,store-2,store-3,store-4,store-5,store-6,store-7';

const renderFeatureStoreList = (
  annotation?: string,
  availableStoreMap: Map<string, string> = new Map(),
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
    <MemoryRouter>
      <NotebookFeatureStoreList
        notebook={notebook}
        availableStoreMap={availableStoreMap}
        availabilityLoaded={availabilityLoaded}
      />
    </MemoryRouter>,
  );
};

describe('NotebookFeatureStoreList', () => {
  it('should show title and "None" when annotation is absent or empty', () => {
    const { unmount } = render(
      <MemoryRouter>
        <NotebookFeatureStoreList
          notebook={mockNotebookK8sResource({})}
          availableStoreMap={new Map()}
          availabilityLoaded
        />
      </MemoryRouter>,
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
      new Map([
        ['project-a', 'ns-a'],
        ['project-b', 'ns-b'],
        ['project-c', 'ns-c'],
      ]),
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
      <MemoryRouter>
        <NotebookFeatureStoreList
          notebook={mockNotebookK8sResource({
            opts: {
              metadata: {
                annotations: { [FEAST_CONFIG_ANNOTATION]: 'project-a,project-b,project-c' },
              },
            },
          })}
          availableStoreMap={new Map()}
          availabilityLoaded={false}
        />
      </MemoryRouter>,
    );
    expect(screen.queryAllByTestId('feature-store-unavailable-icon')).toHaveLength(0);
    expect(
      within(screen.getByTestId('notebook-feature-store-list')).getAllByRole('listitem'),
    ).toHaveLength(3);
    unmount();

    renderFeatureStoreList('project-a,project-b,project-c', new Map([['project-b', 'ns-b']]));
    const list = screen.getByTestId('notebook-feature-store-list');
    const items = within(list).getAllByRole('listitem');
    expect(within(items[0]).getByTestId('feature-store-unavailable-icon')).toBeInTheDocument();
    expect(
      within(items[1]).queryByTestId('feature-store-unavailable-icon'),
    ).not.toBeInTheDocument();
    expect(within(items[2]).getByTestId('feature-store-unavailable-icon')).toBeInTheDocument();
  });

  it('should render links only when availability is loaded', () => {
    const { unmount } = render(
      <MemoryRouter>
        <NotebookFeatureStoreList
          notebook={mockNotebookK8sResource({
            opts: {
              metadata: {
                annotations: { [FEAST_CONFIG_ANNOTATION]: 'project-a,project-b' },
              },
            },
          })}
          availableStoreMap={
            new Map([
              ['project-a', 'ns-a'],
              ['project-b', 'ns-b'],
            ])
          }
          availabilityLoaded={false}
        />
      </MemoryRouter>,
    );
    const list = screen.getByTestId('notebook-feature-store-list');
    expect(within(list).queryAllByRole('link')).toHaveLength(0);
    unmount();

    render(
      <MemoryRouter>
        <NotebookFeatureStoreList
          notebook={mockNotebookK8sResource({
            opts: {
              metadata: {
                annotations: { [FEAST_CONFIG_ANNOTATION]: 'project-a,project-b' },
              },
            },
          })}
          availableStoreMap={
            new Map([
              ['project-a', 'ns-a'],
              ['project-b', 'ns-b'],
            ])
          }
          availabilityLoaded
        />
      </MemoryRouter>,
    );
    const loadedList = screen.getByTestId('notebook-feature-store-list');
    const links = within(loadedList).getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', '/develop-train/feature-store/overview/project-a');
    expect(links[1]).toHaveAttribute('href', '/develop-train/feature-store/overview/project-b');
    expect(JSON.parse(links[0].getAttribute('data-state') ?? '{}')).toEqual({
      registryNamespace: 'ns-a',
    });
    expect(JSON.parse(links[1].getAttribute('data-state') ?? '{}')).toEqual({
      registryNamespace: 'ns-b',
    });
  });

  it('should show info icons with expand/collapse for mixed stores', async () => {
    const user = userEvent.setup();
    renderFeatureStoreList(
      SEVEN_STORES,
      new Map([
        ['store-1', 'ns-1'],
        ['store-3', 'ns-3'],
        ['store-5', 'ns-5'],
      ]),
    );

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
