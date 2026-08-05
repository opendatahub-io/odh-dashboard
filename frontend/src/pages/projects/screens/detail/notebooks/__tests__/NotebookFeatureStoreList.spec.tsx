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
    expect(screen.queryByTestId('feature-store-show-unavailable')).not.toBeInTheDocument();
  });

  it('should expand and collapse for more than 5 available items', async () => {
    const user = userEvent.setup();
    renderFeatureStoreList(
      SEVEN_STORES,
      new Map([
        ['store-1', 'ns-1'],
        ['store-2', 'ns-2'],
        ['store-3', 'ns-3'],
        ['store-4', 'ns-4'],
        ['store-5', 'ns-5'],
        ['store-6', 'ns-6'],
        ['store-7', 'ns-7'],
      ]),
    );

    const list = screen.getByTestId('notebook-feature-store-list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(5);

    const showAllContainer = screen.getByTestId('feature-store-show-all');
    expect(showAllContainer).toHaveTextContent('Show all');

    await user.click(showAllContainer);
    expect(within(list).getAllByRole('listitem')).toHaveLength(7);
    expect(showAllContainer).toHaveTextContent('Show less');

    await user.click(showAllContainer);
    expect(within(list).getAllByRole('listitem')).toHaveLength(5);
    expect(showAllContainer).toHaveTextContent('Show all');
  });

  it('should hide unavailable stores by default and show help popover trigger', () => {
    renderFeatureStoreList('project-a,project-b,project-c', new Map([['project-b', 'ns-b']]));

    const list = screen.getByTestId('notebook-feature-store-list');
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('project-b');
    expect(screen.queryByTestId('feature-store-unavailable-project-a')).not.toBeInTheDocument();
    expect(screen.queryByTestId('feature-store-unavailable-icon')).not.toBeInTheDocument();

    const showUnavailable = screen.getByTestId('feature-store-show-unavailable');
    expect(showUnavailable).toHaveTextContent('Show unavailable');
    expect(
      within(showUnavailable).getByRole('button', { name: 'Show unavailable feature stores' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('feature-store-unavailable-help')).toBeInTheDocument();
  });

  it('should expand and collapse unavailable stores with disabled text', async () => {
    const user = userEvent.setup();
    renderFeatureStoreList('project-a,project-b,project-c', new Map([['project-b', 'ns-b']]));

    await user.click(
      within(screen.getByTestId('feature-store-show-unavailable')).getByRole('button', {
        name: 'Show unavailable feature stores',
      }),
    );

    expect(screen.getByTestId('feature-store-unavailable-project-a')).toHaveTextContent(
      'project-a',
    );
    expect(screen.getByTestId('feature-store-unavailable-project-c')).toHaveTextContent(
      'project-c',
    );
    expect(screen.getByTestId('feature-store-show-unavailable')).toHaveTextContent('Show less');
    expect(screen.queryByTestId('feature-store-unavailable-help')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('feature-store-show-unavailable'));
    expect(screen.queryByTestId('feature-store-unavailable-project-a')).not.toBeInTheDocument();
    expect(screen.getByTestId('feature-store-show-unavailable')).toHaveTextContent(
      'Show unavailable',
    );
  });

  it('should show skeleton rows while loading and hide unavailable controls', () => {
    render(
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
    const loading = screen.getByTestId('notebook-feature-store-loading');
    expect(loading).toBeInTheDocument();
    expect(loading.querySelectorAll('.pf-v6-c-skeleton')).toHaveLength(2);
    expect(screen.queryByTestId('notebook-feature-store-list')).not.toBeInTheDocument();
    expect(screen.queryByTestId('feature-store-unavailable-help')).not.toBeInTheDocument();
    expect(screen.queryByTestId('feature-store-show-unavailable')).not.toBeInTheDocument();
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
    expect(screen.getByTestId('notebook-feature-store-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('notebook-feature-store-list')).not.toBeInTheDocument();
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

  it('should show only available stores with show unavailable for mixed stores', async () => {
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
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(within(list).getByText('store-1')).toBeInTheDocument();
    expect(within(list).getByText('store-3')).toBeInTheDocument();
    expect(within(list).getByText('store-5')).toBeInTheDocument();
    expect(screen.queryByTestId('feature-store-show-all')).not.toBeInTheDocument();

    await user.click(
      within(screen.getByTestId('feature-store-show-unavailable')).getByRole('button', {
        name: 'Show unavailable feature stores',
      }),
    );

    expect(screen.getByTestId('feature-store-unavailable-store-2')).toHaveTextContent('store-2');
    expect(screen.getByTestId('feature-store-unavailable-store-7')).toHaveTextContent('store-7');
  });

  it('should omit show unavailable when all stores are available', () => {
    renderFeatureStoreList(
      'project-a,project-b',
      new Map([
        ['project-a', 'ns-a'],
        ['project-b', 'ns-b'],
      ]),
    );

    expect(screen.queryByTestId('feature-store-show-unavailable')).not.toBeInTheDocument();
  });

  it('should show unavailable toggle when all stores are unavailable', () => {
    renderFeatureStoreList('project-a,project-b', new Map());

    expect(screen.queryByTestId('notebook-feature-store-list')).not.toBeInTheDocument();
    expect(screen.getByTestId('feature-store-show-unavailable')).toHaveTextContent(
      'Show unavailable',
    );
  });

  it('should render show all before show unavailable when both apply', () => {
    renderFeatureStoreList(
      `${SEVEN_STORES},removed-a,removed-b`,
      new Map([
        ['store-1', 'ns-1'],
        ['store-2', 'ns-2'],
        ['store-3', 'ns-3'],
        ['store-4', 'ns-4'],
        ['store-5', 'ns-5'],
        ['store-6', 'ns-6'],
        ['store-7', 'ns-7'],
      ]),
    );

    const showAll = screen.getByTestId('feature-store-show-all');
    const showUnavailable = screen.getByTestId('feature-store-show-unavailable');

    expect(showAll.compareDocumentPosition(showUnavailable)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('should keep each show less toggle anchored to its own section when both are expanded', async () => {
    const user = userEvent.setup();
    renderFeatureStoreList(
      `${SEVEN_STORES},removed-a,removed-b`,
      new Map([
        ['store-1', 'ns-1'],
        ['store-2', 'ns-2'],
        ['store-3', 'ns-3'],
        ['store-4', 'ns-4'],
        ['store-5', 'ns-5'],
        ['store-6', 'ns-6'],
        ['store-7', 'ns-7'],
      ]),
    );

    await user.click(screen.getByTestId('feature-store-show-all'));
    await user.click(
      within(screen.getByTestId('feature-store-show-unavailable')).getByRole('button', {
        name: 'Show unavailable feature stores',
      }),
    );

    const showAll = screen.getByTestId('feature-store-show-all');
    const unavailableList = screen.getByTestId('notebook-feature-store-unavailable-list');
    const showUnavailable = screen.getByTestId('feature-store-show-unavailable');

    expect(showAll).toHaveTextContent('Show less');
    expect(showUnavailable).toHaveTextContent('Show less');
    expect(showAll).toHaveAttribute('aria-label', 'Show less connected feature stores');
    expect(showUnavailable).toHaveAttribute('aria-label', 'Show less unavailable feature stores');
    expect(showAll.compareDocumentPosition(unavailableList)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(unavailableList.compareDocumentPosition(showUnavailable)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });
});
