/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { EvaluationJobsResult } from '~/app/types';
import { mockEvaluationJob } from '~/__tests__/unit/testUtils/mockEvaluationData';
import {
  mockBenchmarkSuiteCollections,
  mockCuratedBenchmarkSuiteCollections,
} from '~/app/mockBenchmarkSuiteCollections';
import EvaluationsPage from '~/app/pages/EvaluationsPage';
import { trackEvalHubEvent } from '~/app/tracking/evalhubTracking';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';

const mockRefresh = jest.fn();
const mockTrackEventOnce = jest.fn();
const mockUseCollectionsQuery = jest.fn();
const mockUseDeleteCollectionMutation = jest.fn();
const mockDeleteCollection = jest.fn();
const mockNotificationSuccess = jest.fn();
const mockNotificationError = jest.fn();
const mockUseEvaluationJobs = jest.fn<
  [EvaluationJobsResult, boolean, Error | undefined, jest.Mock],
  []
>();

const mockUseEvalHubHealth = jest.fn<
  { isHealthy: boolean; loaded: boolean; error: Error | undefined },
  []
>();

jest.mock('~/app/tracking/evalhubTracking', () => ({
  createEvalHubTrackingScope: () => ({ trackEventOnce: mockTrackEventOnce, clear: jest.fn() }),
  trackEvalHubEvent: jest.fn(),
}));

const mockTrackEvalHubEvent = jest.mocked(trackEvalHubEvent);

jest.mock('~/app/hooks/useEvaluationJobs', () => ({
  useEvaluationJobs: () => mockUseEvaluationJobs(),
}));

jest.mock('~/app/hooks/useEvalHubHealth', () => ({
  __esModule: true,
  default: () => mockUseEvalHubHealth(),
}));

const mockUseUser = jest.fn<{ clusterAdmin: boolean }, []>();

jest.mock('~/app/hooks/useUser', () => ({
  __esModule: true,
  default: () => mockUseUser(),
}));

jest.mock('@odh-dashboard/ui-core', () => ({
  ...jest.requireActual('@odh-dashboard/ui-core'),
  WhosMyAdministrator: () => <div data-testid="whos-my-administrator" />,
  ...require('~/__tests__/unit/testUtils/mocks').mockApplicationsPageModule(),
}));

jest.mock('mod-arch-core', () => ({
  NotificationContext: jest.requireActual('react').createContext({
    notificationCount: 0,
    updateNotificationCount: jest.fn(),
    dispatch: jest.fn(),
  }),
  useNamespaceSelector: jest.fn().mockReturnValue({
    namespaces: [{ name: 'test-project' }],
    updatePreferredNamespace: jest.fn(),
    namespacesLoaded: true,
  }),
  asEnumMember: jest.fn((val: unknown) => val),
  DeploymentMode: { Federated: 'federated', Standalone: 'standalone', Kubeflow: 'kubeflow' },
  handleRestFailures: jest.fn((p: Promise<unknown>) => p),
  restDELETE: jest.fn(),
  restGET: jest.fn(),
  isModArchResponse: jest.fn(() => true),
}));

jest.mock('~/app/components/EvaluationStatusModal', () => ({
  __esModule: true,
  default: ({ job, namespace }: { job: unknown; namespace: string }) =>
    job ? <div data-testid="evaluation-status-modal" data-namespace={namespace} /> : null,
}));

jest.mock('~/app/components/StartEvaluationRunModal', () => ({
  __esModule: true,
  default: ({
    collection,
    isOpen,
    onSuccess,
  }: {
    collection?: { name: string };
    isOpen: boolean;
    onSuccess?: () => void;
  }) =>
    isOpen ? (
      <>
        <div data-testid="evaluations-page-start-evaluation-run-modal">{collection?.name}</div>
        <button type="button" data-testid="evaluation-run-success" onClick={onSuccess} />
      </>
    ) : null,
}));

jest.mock('~/app/components/CuratedSuiteRunModal', () => ({
  __esModule: true,
  default: ({
    collection,
    isOpen,
    onSuccess,
  }: {
    collection?: { name: string };
    isOpen: boolean;
    onSuccess?: () => void;
  }) =>
    isOpen ? (
      <>
        <div data-testid="curated-suite-start-evaluation-run-modal">{collection?.name}</div>
        <button type="button" data-testid="curated-suite-run-success" onClick={onSuccess} />
      </>
    ) : null,
}));

jest.mock('~/app/context/CollectionsContext', () => ({
  useCollectionsContext: jest.fn().mockReturnValue({
    response: { items: [] },
    loaded: true,
    loadError: undefined,
    refresh: jest.fn(),
  }),
}));

jest.mock('~/app/hooks/collections', () => ({
  useCollectionsQuery: (...args: unknown[]) => mockUseCollectionsQuery(...args),
  useDeleteCollectionMutation: (...args: unknown[]) => mockUseDeleteCollectionMutation(...args),
}));

jest.mock('~/app/hooks/useProviders', () => ({
  useProviders: () => ({ providers: [], loaded: true, loadError: undefined }),
}));

jest.mock('~/app/hooks/useNotification', () => ({
  useNotification: () => ({
    success: mockNotificationSuccess,
    error: mockNotificationError,
  }),
}));

jest.mock('@odh-dashboard/internal/concepts/projects/ProjectIconWithSize', () =>
  require('~/__tests__/unit/testUtils/mocks').mockProjectIconWithSizeModule(),
);

jest.mock('@odh-dashboard/internal/types', () =>
  require('~/__tests__/unit/testUtils/mocks').mockIconSizeModule(),
);

jest.mock('@odh-dashboard/ui-core/components/projectSelector/ProjectSelector', () =>
  require('~/__tests__/unit/testUtils/mocks').mockProjectSelectorModule(),
);

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const LocationDisplay: React.FC = () => {
  const { pathname, search, state } = useLocation();
  return (
    <>
      <div data-testid="location-pathname">{pathname}</div>
      <div data-testid="location-search">{search}</div>
      <div data-testid="location-state">{JSON.stringify(state ?? null)}</div>
    </>
  );
};

describe('EvaluationsPage', () => {
  const renderPage = (namespace: string, search = '') =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/${namespace}${search}`]}>
          <LocationDisplay />
          <Routes>
            <Route path="/:namespace" element={<EvaluationsPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

  const selectRunsTab = () => {
    fireEvent.click(screen.getByTestId('runs-tab'));
  };

  const clickFilterOption = (testId: string) => {
    fireEvent.click(within(screen.getByTestId(testId)).getByRole('checkbox'));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    mockUseEvalHubHealth.mockReturnValue({ isHealthy: true, loaded: true, error: undefined });
    mockUseEvaluationJobs.mockReturnValue([
      { jobs: [], totalCount: 0, truncated: false },
      true,
      undefined,
      mockRefresh,
    ]);
    mockUseUser.mockReturnValue({ clusterAdmin: true });
    mockDeleteCollection.mockResolvedValue(undefined);
    mockUseDeleteCollectionMutation.mockReturnValue({
      error: null,
      isPending: false,
      mutateAsync: mockDeleteCollection,
      reset: jest.fn(),
    });
    mockUseCollectionsQuery.mockImplementation((_namespace: string, scope?: string) => ({
      data: {
        items:
          scope === 'system'
            ? mockCuratedBenchmarkSuiteCollections()
            : mockBenchmarkSuiteCollections(),
      },
      isLoading: false,
      error: null,
    }));
  });

  it('should show the Technology Preview inline notification above the tabs', () => {
    renderPage('test-project');
    const alert = screen.getByTestId('evalhub-tech-preview-alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(
      'The AI Evaluations UI is in Technology Preview; the AI Evaluations back end is generally available.',
    );
    // The notification sits above the page tabs.
    expect(alert.compareDocumentPosition(screen.getByTestId('evaluations-page-tabs'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('should default to the Gallery tab with curated suite filters', () => {
    renderPage('test-project');
    expect(screen.getByTestId('applications-page')).toBeInTheDocument();
    expect(screen.getByText('Evaluations')).toBeInTheDocument();
    expect(screen.getByTestId('gallery-tab')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('gallery-tab-content')).toBeInTheDocument();
    expect(screen.queryByTestId('create-suite-card')).not.toBeInTheDocument();
    expect(screen.getByTestId('benchmark-suite-card-clawbench')).toBeInTheDocument();
    expect(
      screen.getByTestId('benchmark-suite-card-curated-open-llm-leaderboard-v2'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('benchmark-suites-category-filter')).toBeInTheDocument();
    expect(screen.getByTestId('benchmark-suites-more-filters-toggle')).toHaveTextContent(
      'Show more filters',
    );
    expect(screen.queryByTestId('benchmark-suites-industry-filter')).not.toBeInTheDocument();
    expect(screen.queryByTestId('benchmark-suites-tags-filter')).not.toBeInTheDocument();
    expect(screen.queryByTestId('benchmark-suites-task-filter')).not.toBeInTheDocument();
    expect(screen.queryByTestId('benchmark-suites-modality-filter')).not.toBeInTheDocument();
    // TEMP: Keep model-only behavior until EvalHub supports more evaluation_targets; restore this code when support is added.
    /*
    expect(screen.getByTestId('benchmark-suites-evaluates-filter')).toBeInTheDocument();
    */
    expect(screen.getByTestId('benchmark-suites-benchmarks-filter')).toBeInTheDocument();
    const filterOrder = [
      'benchmark-suites-category-filter',
      'benchmark-suites-benchmarks-filter',
      'benchmark-suites-metrics-filter',
      // TEMP: Keep model-only behavior until EvalHub supports more evaluation_targets; restore this code when support is added.
      // 'benchmark-suites-evaluates-filter',
    ];
    filterOrder.slice(0, -1).forEach((filterId, index) => {
      expect(
        screen
          .getByTestId(filterId)
          .compareDocumentPosition(screen.getByTestId(filterOrder[index + 1])),
      ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(screen.queryByTestId('benchmark-suites-pagination-top')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search collections')).toBeInTheDocument();
    expect(screen.getByTestId('page-description')).toHaveTextContent(
      'Evaluate models using curated benchmark collections. Start with a curated collection, customize it, or create your own. Add a collection to your project to use it in your evaluations.',
    );
  });

  it('should show prerequisites and customize-only actions for mapped Gallery suites', () => {
    const ids = ['trustworthiness-v1', 'tool-use-v1', 'multimodal-v1', 'unmapped-suite'];
    const collections = mockCuratedBenchmarkSuiteCollections()
      .slice(0, ids.length)
      .map((collection, index) => ({
        ...collection,
        resource: { ...collection.resource, id: ids[index] },
        benchmarks: collection.benchmarks?.map((benchmark, benchmarkIndex) =>
          index === 0 && benchmarkIndex === 0
            ? { ...benchmark, parameters: { ...benchmark.parameters, judge_model: '' } }
            : benchmark,
        ),
      }));
    mockUseCollectionsQuery.mockImplementation((_namespace: string, scope?: string) => ({
      data: {
        items: scope === 'system' ? collections : mockBenchmarkSuiteCollections(),
      },
      isLoading: false,
      error: null,
    }));

    renderPage('test-project');

    expect(
      screen.getByTestId('benchmark-suite-card-prerequisite-trustworthiness-v1'),
    ).toHaveTextContent('Requires a judge model.');
    expect(screen.getByTestId('benchmark-suite-card-prerequisite-tool-use-v1')).toHaveTextContent(
      'Requires a model that supports multiple tool/function calls.',
    );
    expect(screen.getByTestId('benchmark-suite-card-prerequisite-multimodal-v1')).toHaveTextContent(
      'Requires a vision-language model that supports image inputs.',
    );

    ['trustworthiness-v1', 'tool-use-v1', 'multimodal-v1'].forEach((collectionId) => {
      const action = screen.getByTestId(`benchmark-suite-card-primary-action-${collectionId}`);
      expect(action).toHaveTextContent('Customize');
      expect(action).toHaveClass('pf-m-secondary');
      expect(
        screen.queryByTestId(`benchmark-suite-card-dropdown-toggle-${collectionId}`),
      ).not.toBeInTheDocument();
    });

    expect(
      screen.getByTestId('benchmark-suite-card-primary-action-unmapped-suite'),
    ).toHaveTextContent('Run');
    expect(
      screen.getByTestId('benchmark-suite-card-dropdown-toggle-unmapped-suite'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('benchmark-suite-card-primary-action-trustworthiness-v1'));
    expect(screen.getByTestId('location-pathname')).toHaveTextContent(
      '/evaluation/test-project/create/collections/trustworthiness-v1/copy',
    );
  });

  it('should rely on the Benchmark suites view event after navigating from the Runs empty state', () => {
    renderPage('test-project', '?tab=runs');

    fireEvent.click(screen.getByTestId('create-evaluation-button'));

    expect(mockTrackEventOnce).toHaveBeenCalledWith(
      EVAL_HUB_EVENTS.COLLECTION_GALLERY_VIEWED,
      'test-project:tenant:all',
      { surface: 'my_benchmark_suites' },
      { collectionType: 'custom' },
    );
    expect(mockTrackEvalHubEvent).not.toHaveBeenCalled();
  });

  it('should open the suite details drawer when selecting a Gallery suite name', () => {
    renderPage('test-project');

    fireEvent.click(screen.getByTestId('benchmark-suite-card-name-clawbench'));

    expect(screen.getByTestId('collection-drawer-panel')).toBeInTheDocument();
    expect(screen.getByTestId('collection-drawer-panel')).toHaveTextContent('ClawBench');
    expect(screen.getByTestId('collection-drawer-panel')).toHaveTextContent('Run');
  });

  it('should offer Gallery suite customization from the details drawer', () => {
    renderPage('test-project');

    fireEvent.click(screen.getByTestId('benchmark-suite-card-name-clawbench'));
    fireEvent.click(screen.getByTestId('customize-benchmark-suite-button'));

    expect(screen.getByTestId('location-pathname')).toHaveTextContent(
      '/evaluation/test-project/create/collections/clawbench/copy',
    );
    expect(screen.getByTestId('location-state')).toHaveTextContent('{"source":"gallery"}');
  });

  it('should use the curated run flow from the Gallery details drawer', () => {
    renderPage('test-project');

    fireEvent.click(screen.getByTestId('benchmark-suite-card-name-clawbench'));
    fireEvent.click(screen.getByTestId('use-benchmark-suite-button'));

    expect(screen.getByTestId('curated-suite-start-evaluation-run-modal')).toHaveTextContent(
      'ClawBench',
    );
  });

  // TEMP: Keep model-only behavior until EvalHub supports more evaluation_targets; restore this code when support is added.
  /*
  it('should filter Gallery suites by evaluation target', () => {
    renderPage('test-project');

    fireEvent.click(screen.getByTestId('benchmark-suites-evaluates-filter'));
    expect(
      screen.getByTestId('benchmark-suites-evaluates-filter-option-agent'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('benchmark-suites-evaluates-filter-option-model'),
    ).toBeInTheDocument();

    clickFilterOption('benchmark-suites-evaluates-filter-option-model');

    expect(
      screen.getByTestId('benchmark-suite-card-curated-open-llm-leaderboard-v2'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('benchmark-suite-card-clawbench')).not.toBeInTheDocument();
  });
  */

  it('should hide the Gallery evaluation target filter', () => {
    renderPage('test-project');

    expect(screen.queryByTestId('benchmark-suites-evaluates-filter')).not.toBeInTheDocument();
  });

  it('should filter Gallery suites by benchmark, category, tags, task, metric, modality, and industry', () => {
    renderPage('test-project');

    fireEvent.click(screen.getByTestId('benchmark-suites-more-filters-toggle'));

    fireEvent.click(screen.getByTestId('benchmark-suites-benchmarks-filter'));
    expect(
      screen.getByTestId('benchmark-suites-benchmarks-filter-option-code-generation'),
    ).toBeInTheDocument();
    clickFilterOption('benchmark-suites-benchmarks-filter-option-code-generation');
    expect(
      screen.getByTestId('benchmark-suite-card-software-engineering-agent-suite'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('benchmark-suite-card-clawbench')).not.toBeInTheDocument();

    clickFilterOption('benchmark-suites-benchmarks-filter-option-code-generation');
    fireEvent.click(screen.getByTestId('benchmark-suites-benchmarks-filter'));
    fireEvent.click(screen.getByTestId('benchmark-suites-category-filter'));
    expect(screen.getByTestId('benchmark-suites-category-filter-option-code')).toBeInTheDocument();
    clickFilterOption('benchmark-suites-category-filter-option-code');
    expect(
      screen.getByTestId('benchmark-suite-card-software-engineering-agent-suite'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('benchmark-suite-card-clawbench')).not.toBeInTheDocument();

    clickFilterOption('benchmark-suites-category-filter-option-code');
    fireEvent.click(screen.getByTestId('benchmark-suites-category-filter'));
    fireEvent.click(screen.getByTestId('benchmark-suites-tags-filter'));
    expect(screen.getByTestId('benchmark-suites-tags-filter-option-code')).toBeInTheDocument();
    clickFilterOption('benchmark-suites-tags-filter-option-code');
    expect(
      screen.getByTestId('benchmark-suite-card-software-engineering-agent-suite'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('benchmark-suite-card-clawbench')).not.toBeInTheDocument();

    clickFilterOption('benchmark-suites-tags-filter-option-code');
    fireEvent.click(screen.getByTestId('benchmark-suites-tags-filter'));
    fireEvent.click(screen.getByTestId('benchmark-suites-task-filter'));
    expect(
      screen.getByTestId('benchmark-suites-task-filter-option-code_generation'),
    ).toBeInTheDocument();
    clickFilterOption('benchmark-suites-task-filter-option-code_generation');
    expect(
      screen.getByTestId('benchmark-suite-card-software-engineering-agent-suite'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('benchmark-suite-card-clawbench')).not.toBeInTheDocument();

    clickFilterOption('benchmark-suites-task-filter-option-code_generation');
    fireEvent.click(screen.getByTestId('benchmark-suites-task-filter'));
    fireEvent.click(screen.getByTestId('benchmark-suites-modality-filter'));
    expect(screen.getByTestId('benchmark-suites-modality-filter-option-code')).toBeInTheDocument();
    clickFilterOption('benchmark-suites-modality-filter-option-code');
    expect(
      screen.getByTestId('benchmark-suite-card-software-engineering-agent-suite'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('benchmark-suite-card-clawbench')).not.toBeInTheDocument();

    clickFilterOption('benchmark-suites-modality-filter-option-code');
    fireEvent.click(screen.getByTestId('benchmark-suites-modality-filter'));
    fireEvent.click(screen.getByTestId('benchmark-suites-metrics-filter'));
    expect(
      screen.getByTestId('benchmark-suites-metrics-filter-option-accuracy'),
    ).toBeInTheDocument();
    clickFilterOption('benchmark-suites-metrics-filter-option-accuracy');
    expect(
      screen.getByTestId('benchmark-suite-card-software-engineering-agent-suite'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('benchmark-suite-card-clawbench')).not.toBeInTheDocument();

    clickFilterOption('benchmark-suites-metrics-filter-option-accuracy');
    fireEvent.click(screen.getByTestId('benchmark-suites-metrics-filter'));
    fireEvent.click(screen.getByTestId('benchmark-suites-industry-filter'));
    expect(screen.getByTestId('benchmark-suites-industry-filter-option-telco')).toBeInTheDocument();
    clickFilterOption('benchmark-suites-industry-filter-option-telco');
    expect(
      screen.getByTestId('benchmark-suite-card-software-engineering-agent-suite'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('benchmark-suite-card-clawbench')).not.toBeInTheDocument();
  });

  it('should allow multiple selections within a Gallery filter', () => {
    renderPage('test-project');

    fireEvent.click(screen.getByTestId('benchmark-suites-category-filter'));
    clickFilterOption('benchmark-suites-category-filter-option-code');
    clickFilterOption('benchmark-suites-category-filter-option-trustworthiness');

    expect(screen.getByTestId('benchmark-suites-category-filter-badge')).toHaveTextContent('2');
    expect(
      screen.getByTestId('benchmark-suite-card-software-engineering-agent-suite'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('benchmark-suite-card-curated-agent-safety-suite'),
    ).toBeInTheDocument();
  });

  it('should track collection filter values and ignore empty values', () => {
    renderPage('test-project');

    const searchInput = screen.getByPlaceholderText('Search collections');
    fireEvent.change(searchInput, { target: { value: '  suite  ' } });
    expect(mockTrackEvalHubEvent).not.toHaveBeenCalled();

    fireEvent.keyDown(searchInput, { key: 'Enter' });
    expect(mockTrackEvalHubEvent).toHaveBeenCalledWith(
      EVAL_HUB_EVENTS.BENCHMARK_COLLECTION_FILTER_APPLIED,
      {
        filterType: 'search',
        value: '5',
        surface: 'collection_gallery',
      },
      expect.objectContaining({ collectionType: 'system' }),
    );

    mockTrackEvalHubEvent.mockClear();
    fireEvent.change(searchInput, { target: { value: '' } });
    fireEvent.keyDown(searchInput, { key: 'Enter' });
    expect(mockTrackEvalHubEvent).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('benchmark-suites-category-filter'));
    clickFilterOption('benchmark-suites-category-filter-option-trustworthiness');
    clickFilterOption('benchmark-suites-category-filter-option-code');
    expect(mockTrackEvalHubEvent).toHaveBeenLastCalledWith(
      EVAL_HUB_EVENTS.BENCHMARK_COLLECTION_FILTER_APPLIED,
      {
        filterType: 'category',
        value: 'code, trustworthiness',
        surface: 'collection_gallery',
      },
      expect.objectContaining({ collectionType: 'system' }),
    );

    mockTrackEvalHubEvent.mockClear();
    clickFilterOption('benchmark-suites-category-filter-option-code');
    expect(mockTrackEvalHubEvent).toHaveBeenCalledWith(
      EVAL_HUB_EVENTS.BENCHMARK_COLLECTION_FILTER_APPLIED,
      {
        filterType: 'category',
        value: 'trustworthiness',
        surface: 'collection_gallery',
      },
      expect.objectContaining({ collectionType: 'system' }),
    );

    mockTrackEvalHubEvent.mockClear();
    clickFilterOption('benchmark-suites-category-filter-option-trustworthiness');
    expect(mockTrackEvalHubEvent).not.toHaveBeenCalled();
  });

  it('should not gate the Evaluate tab on the Runs request', () => {
    mockUseEvaluationJobs.mockReturnValue([
      { jobs: [], totalCount: 0, truncated: false },
      false,
      new Error('Runs unavailable'),
      mockRefresh,
    ]);

    renderPage('test-project', '?tab=evaluate');

    expect(screen.getByTestId('evaluate-tab')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('evaluate-tab')).toHaveAttribute(
      'aria-label',
      'Benchmark collections tab',
    );
    expect(screen.getByTestId('create-suite-card')).toBeInTheDocument();
    expect(screen.queryByTestId('evalhub-load-error-admin-empty-state')).not.toBeInTheDocument();
  });

  it('should track create-suite opens from the tenant gallery surface', () => {
    renderPage('test-project', '?tab=evaluate');

    fireEvent.click(screen.getByTestId('create-suite-button'));

    expect(mockTrackEvalHubEvent).toHaveBeenCalledWith(EVAL_HUB_EVENTS.COLLECTION_CREATE_OPENED, {
      surface: 'my_benchmark_suites',
    });
  });

  it('should keep the create-suite card visible while tenant suites are loading', () => {
    mockUseCollectionsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: true,
      error: null,
    });

    renderPage('test-project', '?tab=evaluate');

    expect(screen.getByTestId('create-suite-card')).toBeInTheDocument();
    const loadingCards = screen.getAllByTestId('benchmark-suite-card-loading');
    expect(loadingCards).toHaveLength(2);
    expect(screen.getByTestId('benchmark-suites-gallery').children).toHaveLength(3);
    expect(
      loadingCards[0].querySelectorAll('.evalhub-benchmark-suite-card__loading-title'),
    ).toHaveLength(1);
  });

  it('should show the suite contextual actions and delete confirmation modal', () => {
    renderPage('test-project', '?tab=evaluate');

    fireEvent.click(screen.getByTestId('benchmark-suite-card-menu-model-suite-2'));

    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeEnabled();
    expect(screen.getByText('Duplicate')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));

    expect(screen.getByTestId('benchmark-suite-delete-modal')).toBeInTheDocument();
    expect(screen.getByTestId('benchmark-suite-delete-modal')).toHaveTextContent(
      'The Model suite 2 collection will be permanently deleted.',
    );

    fireEvent.click(screen.getByTestId('benchmark-suite-delete-cancel'));

    expect(screen.queryByTestId('benchmark-suite-delete-modal')).not.toBeInTheDocument();
    expect(mockTrackEvalHubEvent).not.toHaveBeenCalledWith(
      EVAL_HUB_EVENTS.COLLECTION_DELETED,
      expect.anything(),
      expect.anything(),
    );
  });

  it('should navigate to the copy suite page from Duplicate', () => {
    renderPage('test-project', '?tab=evaluate');

    fireEvent.click(screen.getByTestId('benchmark-suite-card-menu-model-suite-2'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Duplicate' }));

    expect(screen.getByTestId('location-pathname')).toHaveTextContent(
      '/evaluation/test-project/create/collections/model-suite-2/copy',
    );
    expect(screen.getByTestId('location-state')).toHaveTextContent('{"source":"evaluate"}');
    expect(mockTrackEvalHubEvent).toHaveBeenCalledWith(
      EVAL_HUB_EVENTS.COLLECTION_CUSTOMIZE_CLICKED,
      expect.objectContaining({
        collectionName: 'Model suite 2',
        surface: 'my_benchmark_suites',
      }),
      expect.objectContaining({
        collectionType: 'custom',
        providerType: expect.any(String),
      }),
    );
  });

  it('should navigate to the edit suite page with the Evaluate tab as its source', () => {
    renderPage('test-project', '?tab=evaluate');

    fireEvent.click(screen.getByTestId('benchmark-suite-card-menu-model-suite-2'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));

    expect(screen.getByTestId('location-pathname')).toHaveTextContent(
      '/evaluation/test-project/create/collections/model-suite-2/edit',
    );
    expect(screen.getByTestId('location-state')).toHaveTextContent('{"source":"evaluate"}');
    expect(mockTrackEvalHubEvent).toHaveBeenCalledWith(
      EVAL_HUB_EVENTS.COLLECTION_EDIT_OPENED,
      expect.objectContaining({
        collectionName: 'Model suite 2',
        surface: 'my_benchmark_suites',
      }),
      expect.objectContaining({
        collectionType: 'custom',
        providerType: expect.any(String),
      }),
    );
    expect(mockTrackEvalHubEvent).toHaveBeenCalledTimes(1);
  });

  it('should show a success notification after deleting a benchmark suite', async () => {
    renderPage('test-project', '?tab=evaluate');

    fireEvent.click(screen.getByTestId('benchmark-suite-card-menu-model-suite-2'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    fireEvent.click(screen.getByTestId('benchmark-suite-delete-confirm'));

    await waitFor(() => expect(mockDeleteCollection).toHaveBeenCalledWith('model-suite-2'));
    expect(mockNotificationSuccess).toHaveBeenCalledWith(
      'Collection deleted',
      '"Model suite 2" has been deleted.',
    );
    expect(mockTrackEvalHubEvent).toHaveBeenCalledWith(
      EVAL_HUB_EVENTS.COLLECTION_DELETED,
      {
        collectionName: 'Model suite 2',
        outcome: 'success',
      },
      expect.objectContaining({
        collectionType: 'custom',
        providerType: expect.any(String),
      }),
    );
  });

  it('should render the tenant benchmark suites in newest-first order on the preview', () => {
    const suiteIds = [
      'agent-safety-suite',
      'code-quality-suite',
      'model-suite-2',
      'model-suite-7',
      'trace-evaluation-suite',
    ];
    const createdAtBySuiteId: Record<string, string> = {
      'agent-safety-suite': '2026-10-01T12:00:00Z',
      'code-quality-suite': '2026-10-04T12:00:00Z',
      'model-suite-2': '2026-10-03T12:00:00Z',
      'model-suite-7': '2026-10-05T12:00:00Z',
      'trace-evaluation-suite': '2026-10-02T12:00:00Z',
    };
    const collections = mockBenchmarkSuiteCollections()
      .filter(({ resource }) => suiteIds.includes(resource.id))
      .map((collection) => ({
        ...collection,
        resource: {
          ...collection.resource,
          // eslint-disable-next-line camelcase
          created_at: createdAtBySuiteId[collection.resource.id],
        },
      }))
      .toReversed();
    mockUseCollectionsQuery.mockReturnValue({
      // eslint-disable-next-line camelcase
      data: { items: collections, total_count: 125 },
      isLoading: false,
      error: null,
    });

    renderPage('test-project', '?tab=evaluate');

    expect(
      screen.getByRole('heading', { name: 'Recent benchmark collections' }),
    ).toBeInTheDocument();

    const expectedOrder = [
      'model-suite-7',
      'code-quality-suite',
      'model-suite-2',
      'trace-evaluation-suite',
      'agent-safety-suite',
    ];
    expectedOrder.slice(0, -1).forEach((suiteId, index) => {
      expect(
        screen
          .getByTestId(`benchmark-suite-card-name-${suiteId}`)
          .compareDocumentPosition(
            screen.getByTestId(`benchmark-suite-card-name-${expectedOrder[index + 1]}`),
          ),
      ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(mockUseCollectionsQuery).toHaveBeenCalledWith(
      'test-project',
      'tenant',
      200,
      undefined,
      undefined,
      undefined,
    );
  });

  it('should always show the recent collections heading while keeping View all', () => {
    const collections = mockBenchmarkSuiteCollections().slice(0, 5);
    mockUseCollectionsQuery.mockReturnValue({
      // eslint-disable-next-line camelcase
      data: { items: collections, total_count: collections.length },
      isLoading: false,
      error: null,
    });

    renderPage('test-project', '?tab=evaluate');

    expect(
      screen.getByRole('heading', { name: 'Recent benchmark collections' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View all' })).toBeInTheDocument();
  });

  it('should link to the tenant benchmark collections page from the section header', () => {
    renderPage('test-project', '?tab=evaluate');

    expect(screen.getByRole('link', { name: 'View all' })).toHaveAttribute(
      'href',
      '/evaluation/test-project/collections',
    );
  });

  it('should hide Red Hat validated collections until more evaluation targets are available', () => {
    renderPage('test-project', '?tab=evaluate');

    expect(screen.queryByTestId('start-single-benchmark-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('curated-suite-categories')).not.toBeInTheDocument();
    expect(screen.getByTestId('browse-all-benchmarks')).toBeInTheDocument();
    expect(screen.getByTestId('browse-all-benchmarks-explore')).toHaveAttribute(
      'href',
      '/evaluation/test-project/create/benchmarks',
    );
  });

  it('should render the browse-all-benchmarks card as a default white card', () => {
    renderPage('test-project', '?tab=evaluate');

    // RHAI-15138: keep the box on the plain white card (no grey secondary variant).
    expect(screen.getByTestId('browse-all-benchmarks')).not.toHaveClass('pf-m-secondary');
  });

  it('should track opening the benchmark catalog from the browse benchmarks section', () => {
    renderPage('test-project', '?tab=evaluate');

    fireEvent.click(screen.getByTestId('browse-all-benchmarks-explore'));

    expect(mockTrackEvalHubEvent).toHaveBeenCalledWith(EVAL_HUB_EVENTS.BENCHMARK_CATALOG_OPENED, {
      surface: 'my_benchmark_suites',
    });
  });

  it('should open the start evaluation run modal for a suite', () => {
    renderPage('test-project', '?tab=evaluate');

    fireEvent.click(
      within(screen.getByTestId('benchmark-suite-card-model-suite-2')).getByRole('button', {
        name: 'Run',
      }),
    );

    expect(screen.getByTestId('evaluations-page-start-evaluation-run-modal')).toHaveTextContent(
      'Model suite 2',
    );
  });

  it('should refresh evaluations before navigating to the Runs tab after a successful run', async () => {
    let resolveRefresh: (() => void) | undefined;
    const refresh = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    mockUseEvaluationJobs.mockReturnValue([
      { jobs: [], totalCount: 0, truncated: false },
      true,
      undefined,
      refresh,
    ]);
    renderPage('test-project', '?tab=evaluate');

    fireEvent.click(screen.getAllByRole('button', { name: 'Run' })[0]);
    fireEvent.click(screen.getByTestId('evaluation-run-success'));

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('location-search')).toHaveTextContent('?tab=evaluate');

    resolveRefresh?.();

    await waitFor(() =>
      expect(screen.getByTestId('location-search')).toHaveTextContent('?tab=runs'),
    );
  });

  it('should refresh evaluations before navigating after a successful Gallery run', async () => {
    let resolveRefresh: (() => void) | undefined;
    const refresh = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    mockUseEvaluationJobs.mockReturnValue([
      { jobs: [], totalCount: 0, truncated: false },
      true,
      undefined,
      refresh,
    ]);
    renderPage('test-project');

    fireEvent.click(screen.getByTestId('benchmark-suite-card-primary-action-clawbench'));
    fireEvent.click(screen.getByTestId('curated-suite-run-success'));

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('location-search')).toHaveTextContent('');

    resolveRefresh?.();

    await waitFor(() =>
      expect(screen.getByTestId('location-search')).toHaveTextContent('?tab=runs'),
    );
  });

  it('should use the Runs tab from the URL and render its content description', () => {
    const jobs = [mockEvaluationJob({ id: 'job-1', name: 'Test Eval', state: 'completed' })];
    mockUseEvaluationJobs.mockReturnValue([
      { jobs, totalCount: jobs.length, truncated: false },
      true,
      undefined,
      mockRefresh,
    ]);
    renderPage('test-project', '?tab=runs');

    expect(screen.getByTestId('runs-tab')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('evaluations-table')).toBeInTheDocument();
    expect(screen.getByTestId('page-description')).toHaveTextContent(
      'Evaluate models using curated benchmark collections. Start with a curated collection, customize it, or create your own. Add a collection to your project to use it in your evaluations.',
    );
    expect(screen.getByTestId('runs-tab-description')).toHaveTextContent(
      'Start and manage evaluation runs for models, agents, and datasets.',
    );
  });

  it('should show a truncation alert when the evaluation jobs list is truncated', () => {
    const jobs = [mockEvaluationJob({ id: 'job-1', name: 'Test Eval', state: 'completed' })];
    mockUseEvaluationJobs.mockReturnValue([
      { jobs, totalCount: 2500, truncated: true },
      true,
      undefined,
      mockRefresh,
    ]);
    renderPage('test-project', '?tab=runs');

    const alert = screen.getByTestId('evaluations-truncated-alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Showing 1 of 2500 evaluation runs.');
  });

  it('should not show a truncation alert when the list is complete', () => {
    const jobs = [mockEvaluationJob({ id: 'job-1', name: 'Test Eval', state: 'completed' })];
    mockUseEvaluationJobs.mockReturnValue([
      { jobs, totalCount: jobs.length, truncated: false },
      true,
      undefined,
      mockRefresh,
    ]);
    renderPage('test-project', '?tab=runs');

    expect(screen.queryByTestId('evaluations-truncated-alert')).not.toBeInTheDocument();
  });

  it('should persist tab selection in the URL when switching tabs', () => {
    renderPage('test-project');
    selectRunsTab();

    expect(screen.getByTestId('location-search')).toHaveTextContent('?tab=runs');
  });

  it('should render the project selector with the current namespace', () => {
    renderPage('test-project');
    expect(screen.getByTestId('project-selector')).toHaveTextContent('test-project');
  });

  describe('when EvalHub service is unavailable', () => {
    beforeEach(() => {
      mockUseEvalHubHealth.mockReturnValue({ isHealthy: false, loaded: true, error: undefined });
    });

    describe('when user is a cluster admin', () => {
      beforeEach(() => {
        mockUseUser.mockReturnValue({ clusterAdmin: true });
      });

      it('should show the admin unavailable empty state', () => {
        renderPage('test-project');
        expect(screen.getByTestId('evalhub-unavailable-empty-state')).toBeInTheDocument();
      });

      it('should display the correct admin unavailable message', () => {
        renderPage('test-project');
        expect(
          screen.getByText(
            /To use evaluations, enable the evaluation service using the TrustyAI Operator/,
          ),
        ).toBeInTheDocument();
      });
    });

    describe('when user is not a cluster admin', () => {
      beforeEach(() => {
        mockUseUser.mockReturnValue({ clusterAdmin: false });
      });

      it('should show the non-admin empty state', () => {
        renderPage('test-project');
        expect(screen.getByTestId('evalhub-nonadmin-empty-state')).toBeInTheDocument();
      });

      it('should display the correct non-admin message', () => {
        renderPage('test-project');
        expect(
          screen.getByText(
            /To use this service, request that your administrator enable evaluations for this cluster/,
          ),
        ).toBeInTheDocument();
      });

      it('should show the Who is my administrator link', () => {
        renderPage('test-project');
        expect(screen.getByTestId('whos-my-administrator')).toBeInTheDocument();
      });
    });
  });

  describe('when the health check fails with a real error', () => {
    it('should not show the unavailable empty state', () => {
      mockUseEvalHubHealth.mockReturnValue({
        isHealthy: false,
        loaded: true,
        error: new Error('Network Error'),
      });
      renderPage('test-project');
      expect(screen.queryByTestId('evalhub-unavailable-empty-state')).not.toBeInTheDocument();
    });
  });

  describe('when EvalHub service is healthy', () => {
    it('should show empty state when there are no evaluation runs', () => {
      renderPage('test-project');
      selectRunsTab();
      expect(screen.getByTestId('eval-hub-empty-state')).toBeInTheDocument();
      expect(screen.queryByTestId('runs-tab-description')).not.toBeInTheDocument();
    });

    it('should render the evaluations table when evaluations exist', () => {
      const jobs = [mockEvaluationJob({ id: 'job-1', name: 'Test Eval', state: 'completed' })];
      mockUseEvaluationJobs.mockReturnValue([
        { jobs, totalCount: jobs.length, truncated: false },
        true,
        undefined,
        mockRefresh,
      ]);
      renderPage('test-project');
      selectRunsTab();

      expect(screen.queryByTestId('eval-hub-empty-state')).not.toBeInTheDocument();
      expect(screen.getByTestId('evaluations-table')).toBeInTheDocument();
    });

    it('should clear the selected job when navigating to a different namespace', async () => {
      const jobs = [mockEvaluationJob({ id: 'job-1', name: 'Test Eval', state: 'failed' })];
      mockUseEvaluationJobs.mockReturnValue([
        { jobs, totalCount: jobs.length, truncated: false },
        true,
        undefined,
        mockRefresh,
      ]);

      const NavigateHelper: React.FC = () => {
        const navigate = useNavigate();
        return (
          <button data-testid="navigate-ns-b" onClick={() => navigate('/ns-b')}>
            Go to ns-b
          </button>
        );
      };

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/ns-a']}>
            <LocationDisplay />
            <NavigateHelper />
            <Routes>
              <Route path="/:namespace" element={<EvaluationsPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      );

      selectRunsTab();
      const statusLabel = screen.getByTestId('evaluation-status-button');
      fireEvent.click(within(statusLabel).getByRole('button'));
      await waitFor(() => {
        expect(screen.getByTestId('evaluation-status-modal')).toBeInTheDocument();
      });
      expect(screen.getByTestId('evaluation-status-modal')).toHaveAttribute(
        'data-namespace',
        'ns-a',
      );

      fireEvent.click(screen.getByTestId('navigate-ns-b'));
      await waitFor(() => {
        expect(screen.queryByTestId('evaluation-status-modal')).not.toBeInTheDocument();
      });
    });
  });
});
