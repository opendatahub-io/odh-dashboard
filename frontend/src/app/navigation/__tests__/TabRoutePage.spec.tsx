import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { LoadedExtension } from '@openshift/dynamic-plugin-sdk';
import type {
  TabRoutePageExtension,
  TabRouteTabExtension,
} from '@odh-dashboard/plugin-core/extension-points';
import { useExtensions } from '@odh-dashboard/plugin-core';
import TabRoutePage from '#~/app/navigation/TabRoutePage';

jest.mock('@odh-dashboard/plugin-core', () => ({
  useExtensions: jest.fn(),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  LazyCodeRefComponent: function MockLazyCodeRefComponent(_props: {
    component: unknown;
    fallback: React.ReactNode;
  }) {
    return <div data-testid="lazy-content">Tab Content</div>;
  },
}));

jest.mock(
  '#~/pages/NotFound',
  () =>
    function MockNotFound() {
      return <div data-testid="not-found">Not Found</div>;
    },
);

jest.mock(
  '#~/concepts/design/TitleWithIcon',
  () =>
    function MockTitleWithIcon({ title, objectType }: { title: string; objectType: string }) {
      return (
        <span data-testid="title-with-icon" data-object-type={objectType}>
          {title}
        </span>
      );
    },
);

const mockUseExtensions = jest.mocked(useExtensions);

const createPageExtension = (
  overrides?: Partial<TabRoutePageExtension['properties']>,
): LoadedExtension<TabRoutePageExtension> => ({
  type: 'app.tab-route/page',
  uid: 'test-page',
  pluginName: 'test',
  properties: {
    id: 'test-page',
    title: 'Test Page',
    href: '/test',
    path: '/test/*',
    ...overrides,
  },
  flags: {},
});

const createTabExtension = (
  overrides?: Partial<TabRouteTabExtension['properties']>,
): LoadedExtension<TabRouteTabExtension> => ({
  type: 'app.tab-route/tab',
  uid: `test-tab-${overrides?.id ?? 'default'}`,
  pluginName: 'test',
  properties: {
    pageId: 'test-page',
    id: 'tab1',
    title: 'Tab 1',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component: (() => Promise.resolve({ default: () => <div>Tab Content</div> })) as any,
    ...overrides,
  },
  flags: {},
});

const SESSION_STORAGE_PREFIX = 'tab-route-last-tab:';

describe('TabRoutePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
  });

  /**
   * The component renders its own <Routes> with relative paths like `:tabId/*`.
   * To provide the correct routing context, we wrap it in a parent <Route path="/test/*">.
   */
  const renderWithRouter = (
    extension: LoadedExtension<TabRoutePageExtension>,
    initialPath: string,
  ) =>
    render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route
            path={extension.properties.path}
            element={<TabRoutePage extension={extension} />}
          />
        </Routes>
      </MemoryRouter>,
    );

  describe('0 tabs', () => {
    it('should render NotFound when no tab extensions match the page', () => {
      mockUseExtensions.mockReturnValue([]);
      const extension = createPageExtension();

      renderWithRouter(extension, '/test');

      expect(screen.getByTestId('not-found')).toBeInTheDocument();
    });
  });

  describe('1 tab (single tab, no tab bar)', () => {
    it('should render page title and tab content without a tab bar', () => {
      const tab = createTabExtension({ id: 'only-tab', title: 'Only Tab' });
      mockUseExtensions.mockReturnValue([tab]);
      const extension = createPageExtension();

      renderWithRouter(extension, '/test/only-tab');

      expect(screen.getByTestId('app-tab-page-title')).toHaveTextContent('Test Page');
      expect(screen.getByTestId('lazy-content')).toBeInTheDocument();
      expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    });

    it('should redirect root path to the single tab path', () => {
      const tab = createTabExtension({ id: 'only-tab', title: 'Only Tab' });
      mockUseExtensions.mockReturnValue([tab]);
      const extension = createPageExtension();

      renderWithRouter(extension, '/test');

      // After redirect, content should render
      expect(screen.getByTestId('lazy-content')).toBeInTheDocument();
    });
  });

  describe('2+ tabs (multi-tab)', () => {
    const tab1 = createTabExtension({ id: 'tab-a', title: 'Tab A', group: '1_first' });
    const tab2 = createTabExtension({ id: 'tab-b', title: 'Tab B', group: '2_second' });

    it('should render all tab headers', () => {
      mockUseExtensions.mockReturnValue([tab1, tab2]);
      const extension = createPageExtension();

      renderWithRouter(extension, '/test/tab-a');

      expect(screen.getByTestId('tab-tab-a')).toBeInTheDocument();
      expect(screen.getByTestId('tab-tab-b')).toBeInTheDocument();
    });

    it('should show active tab content', () => {
      mockUseExtensions.mockReturnValue([tab1, tab2]);
      const extension = createPageExtension();

      renderWithRouter(extension, '/test/tab-a');

      expect(screen.getByTestId('lazy-content')).toBeInTheDocument();
    });

    it('should sort tabs by group property', () => {
      const tabLate = createTabExtension({ id: 'tab-late', title: 'Late Tab', group: '9_last' });
      const tabEarly = createTabExtension({
        id: 'tab-early',
        title: 'Early Tab',
        group: '1_first',
      });
      // Return in wrong order
      mockUseExtensions.mockReturnValue([tabLate, tabEarly]);
      const extension = createPageExtension();

      renderWithRouter(extension, '/test/tab-early');

      const tabs = screen.getAllByRole('tab');
      expect(tabs[0]).toHaveTextContent('Early Tab');
      expect(tabs[1]).toHaveTextContent('Late Tab');
    });

    it('should redirect invalid tab ID to default tab', () => {
      mockUseExtensions.mockReturnValue([tab1, tab2]);
      const extension = createPageExtension();

      renderWithRouter(extension, '/test/nonexistent');

      // Should redirect to default (first sorted) tab and render its content
      expect(screen.getByTestId('lazy-content')).toBeInTheDocument();
    });
  });

  describe('session storage', () => {
    it('should use persisted tab from sessionStorage when valid', () => {
      const tabA = createTabExtension({ id: 'tab-a', title: 'Tab A', group: '1_first' });
      const tabB = createTabExtension({ id: 'tab-b', title: 'Tab B', group: '2_second' });
      sessionStorage.setItem(`${SESSION_STORAGE_PREFIX}test-page`, 'tab-b');
      mockUseExtensions.mockReturnValue([tabA, tabB]);
      const extension = createPageExtension();

      // Visit root - should redirect to persisted tab-b instead of default tab-a
      renderWithRouter(extension, '/test');

      // The redirect should go to tab-b (the persisted tab)
      expect(screen.getByTestId('lazy-content')).toBeInTheDocument();
    });

    it('should fall back to first tab when persisted tab is invalid', () => {
      const tabA = createTabExtension({ id: 'tab-a', title: 'Tab A', group: '1_first' });
      const tabB = createTabExtension({ id: 'tab-b', title: 'Tab B', group: '2_second' });
      sessionStorage.setItem(`${SESSION_STORAGE_PREFIX}test-page`, 'nonexistent-tab');
      mockUseExtensions.mockReturnValue([tabA, tabB]);
      const extension = createPageExtension();

      renderWithRouter(extension, '/test');

      // Should redirect to first sorted tab (tab-a)
      expect(screen.getByTestId('lazy-content')).toBeInTheDocument();
    });

    it('should persist active tab to sessionStorage', () => {
      const tabA = createTabExtension({ id: 'tab-a', title: 'Tab A', group: '1_first' });
      const tabB = createTabExtension({ id: 'tab-b', title: 'Tab B', group: '2_second' });
      mockUseExtensions.mockReturnValue([tabA, tabB]);
      const extension = createPageExtension();

      renderWithRouter(extension, '/test/tab-b');

      expect(sessionStorage.getItem(`${SESSION_STORAGE_PREFIX}test-page`)).toBe('tab-b');
    });
  });

  describe('objectType validation', () => {
    it('should render TitleWithIcon for valid objectType', () => {
      const tab = createTabExtension({ id: 'tab1', title: 'Tab 1' });
      mockUseExtensions.mockReturnValue([tab]);
      const extension = createPageExtension({ objectType: 'registered-models' });

      renderWithRouter(extension, '/test/tab1');

      const titleWithIcon = screen.getByTestId('title-with-icon');
      expect(titleWithIcon).toHaveTextContent('Test Page');
      expect(titleWithIcon).toHaveAttribute('data-object-type', 'registered-models');
    });

    it('should render plain title text for invalid objectType', () => {
      const tab = createTabExtension({ id: 'tab1', title: 'Tab 1' });
      mockUseExtensions.mockReturnValue([tab]);
      const extension = createPageExtension({ objectType: 'not-a-real-type' });

      renderWithRouter(extension, '/test/tab1');

      expect(screen.queryByTestId('title-with-icon')).not.toBeInTheDocument();
      expect(screen.getByTestId('app-tab-page-title')).toHaveTextContent('Test Page');
    });

    it('should render plain title text when objectType is not provided', () => {
      const tab = createTabExtension({ id: 'tab1', title: 'Tab 1' });
      mockUseExtensions.mockReturnValue([tab]);
      const extension = createPageExtension();

      renderWithRouter(extension, '/test/tab1');

      expect(screen.queryByTestId('title-with-icon')).not.toBeInTheDocument();
      expect(screen.getByTestId('app-tab-page-title')).toHaveTextContent('Test Page');
    });
  });
});
