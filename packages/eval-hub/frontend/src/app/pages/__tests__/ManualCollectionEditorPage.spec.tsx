/* eslint-disable camelcase */
import * as React from 'react';
import { act, fireEvent, screen, within } from '@testing-library/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useFetchState } from 'mod-arch-core';
import { setupTrackingTest } from '~/__tests__/unit/testUtils/setupTrackingTest';
import { getCollection } from '~/app/api/k8s';
import { useProviders } from '~/app/hooks/useProviders';
import { useCopySuiteForm, type CopySuiteBenchmark } from '~/app/pages/useCopySuiteForm';
import ManualCollectionEditorPage from '~/app/pages/ManualCollectionEditorPage';
import {
  evaluationBenchmarkSuitesNavigationState,
  evaluationEvaluateNavigationState,
  evaluationGalleryNavigationState,
} from '~/app/routes';
import { COLLECTION_METADATA_OPTIONS } from '~/app/pages/const';
import {
  getCopySuiteSchema,
  getCopySuiteSettingsSchema,
  type CopySuiteFormValues,
} from '~/app/schemas/copySuite.schema';
import { testDataRefDefaultValues } from '~/app/schemas/testDataRef.schema';
import type { Collection, Provider } from '~/app/types';

const { render, renderHook } = setupTrackingTest();
const mockUseCanCreateCollections = jest.fn();

jest.mock('mod-arch-core', () => ({
  ...jest.requireActual('mod-arch-core'),
  useFetchState: jest.fn(),
  useModularArchContext: () => ({ config: { deploymentMode: 'federated' } }),
}));

jest.mock('~/app/api/k8s', () => ({
  getCollection: jest.fn(),
}));

jest.mock('~/app/hooks/useProviders', () => ({
  useProviders: jest.fn(),
}));

jest.mock('~/app/hooks/collections', () => ({
  ...jest.requireActual('~/app/hooks/collections'),
  useCanCreateCollections: (...args: unknown[]) => mockUseCanCreateCollections(...args),
}));

jest.mock('~/app/hooks/useNamespaceSelectorWithPersistence', () => ({
  useNamespaceSelectorWithPersistence: () => ({
    namespaces: [{ name: 'test-namespace', displayName: 'Test Project' }],
    namespacesLoaded: true,
  }),
}));

jest.mock('~/app/pages/useCopySuiteForm', () => ({
  getBenchmarkKey: (benchmark: { providerId: string; id: string }) =>
    `${benchmark.providerId}:${benchmark.id}`,
  useCopySuiteForm: jest.fn(),
}));

jest.mock('@odh-dashboard/ui-core', () => ({
  ApplicationsPage: ({
    breadcrumb,
    children,
  }: {
    breadcrumb?: import('react').ReactNode;
    children?: import('react').ReactNode;
  }) => (
    <div data-testid="applications-page">
      {breadcrumb}
      {children}
    </div>
  ),
}));

jest.mock('~/app/components/BenchmarkThresholdField', () => ({
  __esModule: true,
  default: ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: number;
    onChange: (value: number) => void;
  }) => (
    <label>
      {label}
      <input
        aria-label={label}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  ),
}));

jest.mock('~/app/components/CopySuiteBenchmarkSelectionStep', () => ({
  __esModule: true,
  default: () => <div data-testid="copy-suite-step-select-benchmarks" />,
}));

jest.mock('~/app/components/CopySuiteBenchmarkDetailsOverlay', () => ({
  __esModule: true,
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="copy-suite-benchmark-details-overlay" /> : null,
}));

jest.mock('~/app/components/BenchmarkWeightsModal', () => ({
  __esModule: true,
  default: () => <div data-testid="copy-suite-benchmark-weights-modal" />,
}));

jest.mock('~/app/components/StartEvaluationRunModal', () => ({
  __esModule: true,
  default: ({
    collection,
    onClonePendingChange,
    onSuccess,
  }: {
    collection?: Collection;
    onClonePendingChange?: (isPending: boolean) => void;
    onSuccess?: () => void;
  }) => (
    <>
      <div data-testid="copy-suite-run-collection">{collection?.name ?? 'none'}</div>
      <button
        type="button"
        data-testid="copy-suite-set-clone-pending"
        onClick={() => onClonePendingChange?.(true)}
      >
        Set clone pending
      </button>
      <button
        type="button"
        data-testid="copy-suite-set-clone-complete"
        onClick={() => onClonePendingChange?.(false)}
      >
        Set clone complete
      </button>
      <button type="button" data-testid="copy-suite-run-success" onClick={onSuccess}>
        Run success
      </button>
    </>
  ),
}));

const mockUseFetchState = jest.mocked(useFetchState);
const mockGetCollection = jest.mocked(getCollection);
const mockUseProviders = jest.mocked(useProviders);
const mockUseCopySuiteForm = jest.mocked(useCopySuiteForm);

const sourceCollection: Collection = {
  resource: { id: 'source-collection' },
  name: 'Curated suite',
  category: 'language',
  benchmarks: [{ id: 'benchmark-one' }],
};

const providers: Provider[] = [
  { resource: { id: 'provider-one' }, name: 'Provider One', benchmarks: [] },
];

const benchmark: CopySuiteBenchmark = {
  id: 'benchmark-one',
  providerId: 'provider-one',
  name: 'Benchmark One',
  weight: 1,
  parameters: [{ key: 'num_examples', type: 'number', value: 100 }],
  threshold: 70,
  availableMetrics: [],
  testDataRef: { ...testDataRefDefaultValues },
};

type Form = ReturnType<typeof useCopySuiteForm>;

const createRhfForm = (values: CopySuiteFormValues): Form['form'] => {
  const { result } = renderHook(() =>
    useForm<CopySuiteFormValues>({
      mode: 'onChange',
      resolver: zodResolver(getCopySuiteSchema(sourceCollection.name)),
      defaultValues: values,
    }),
  );
  return result.current;
};

const defaultFormValues: CopySuiteFormValues = {
  suiteName: 'Curated suite copy',
  suiteDescription: 'Description',
  suiteDomains: ['reasoning', 'trustworthiness'],
  suiteTasks: ['text-generation'],
  suiteModalities: ['text'],
  suiteIndustries: ['technology'],
  // TEMP: Keep model-only behavior until EvalHub supports more evaluation_targets; restore this code when support is added.
  // suiteEvaluates: ['agent'],
  suiteEvaluates: ['model'],
  benchmarks: [benchmark],
};

const makeForm = (overrides: Partial<Form> = {}): Form => {
  const formValues: CopySuiteFormValues = {
    ...defaultFormValues,
    suiteName: overrides.suiteName ?? defaultFormValues.suiteName,
    suiteDescription: overrides.suiteDescription ?? defaultFormValues.suiteDescription,
    suiteDomains: overrides.suiteDomains ?? defaultFormValues.suiteDomains,
    suiteTasks: overrides.suiteTasks ?? defaultFormValues.suiteTasks,
    suiteModalities: overrides.suiteModalities ?? defaultFormValues.suiteModalities,
    suiteIndustries: overrides.suiteIndustries ?? defaultFormValues.suiteIndustries,
    suiteEvaluates: overrides.suiteEvaluates ?? defaultFormValues.suiteEvaluates,
    benchmarks: overrides.benchmarks ?? defaultFormValues.benchmarks,
  };
  const rhfForm = overrides.form ?? createRhfForm(formValues);

  return {
    form: rhfForm,
    suiteName: formValues.suiteName,
    setSuiteName: jest.fn(),
    suiteDescription: formValues.suiteDescription,
    setSuiteDescription: jest.fn(),
    suiteDomains: formValues.suiteDomains,
    suiteTasks: formValues.suiteTasks,
    suiteModalities: formValues.suiteModalities,
    suiteIndustries: formValues.suiteIndustries,
    suiteEvaluates: formValues.suiteEvaluates,
    setSuiteEvaluates: jest.fn(),
    benchmarks: formValues.benchmarks,
    selectedBenchmarkKeys: ['provider-one:benchmark-one'],
    totalWeight: 1,
    weightSegments: [{ label: 'Benchmark One', weight: 1, percentage: 100 }],
    updateBenchmark: jest.fn(),
    applyBenchmarkSelection: jest.fn(),
    handleWeightsChange: jest.fn(),
    isSettingsValid:
      overrides.isSettingsValid ??
      getCopySuiteSettingsSchema(sourceCollection.name).safeParse({
        suiteName: formValues.suiteName,
        suiteDomains: formValues.suiteDomains,
      }).success,
    isValid: overrides.isValid ?? true,
    isSubmitting: overrides.isSubmitting ?? false,
    handleSaveAndRun: jest.fn(),
    handleSaveOnly: jest.fn(),
    handleCancel: jest.fn(),
    buildPendingCollection: jest.fn(() => sourceCollection),
    cloneCollectionForRun: jest.fn(),
    createCollectionForRun: jest.fn(),
    minWeightPercent: 5,
    ...overrides,
  };
};

const LocationDisplay = () => {
  const { pathname, search } = useLocation();
  return <div data-testid="location-display">{pathname + search}</div>;
};

const renderPage = (collectionId = 'source-collection') =>
  render(
    <MemoryRouter
      initialEntries={[`/evaluation/test-namespace/create/collections/${collectionId}/copy`]}
    >
      <LocationDisplay />
      <Routes>
        <Route
          path="/evaluation/:namespace/create/collections/:collectionId/copy"
          element={<ManualCollectionEditorPage mode="copy" />}
        />
      </Routes>
    </MemoryRouter>,
  );

const renderGalleryOriginPage = () =>
  render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: '/evaluation/test-namespace/create/collections/source-collection/copy',
          state: { source: 'gallery' },
        },
      ]}
    >
      <LocationDisplay />
      <Routes>
        <Route
          path="/evaluation/:namespace/create/collections/:collectionId/copy"
          element={<ManualCollectionEditorPage mode="copy" />}
        />
      </Routes>
    </MemoryRouter>,
  );

const renderBenchmarkSuitesOriginPage = (collectionId = 'source-collection') =>
  render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: `/evaluation/test-namespace/create/collections/${collectionId}/copy`,
          state: evaluationBenchmarkSuitesNavigationState,
        },
      ]}
    >
      <LocationDisplay />
      <Routes>
        <Route
          path="/evaluation/:namespace/create/collections/:collectionId/copy"
          element={<ManualCollectionEditorPage mode="copy" />}
        />
      </Routes>
    </MemoryRouter>,
  );

const renderEvaluateOriginPage = () =>
  render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: '/evaluation/test-namespace/create/collections/source-collection/copy',
          state: evaluationEvaluateNavigationState,
        },
      ]}
    >
      <LocationDisplay />
      <Routes>
        <Route
          path="/evaluation/:namespace/create/collections/:collectionId/copy"
          element={<ManualCollectionEditorPage mode="copy" />}
        />
      </Routes>
    </MemoryRouter>,
  );

const renderCreatePage = (state?: unknown) =>
  render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: '/evaluation/test-namespace/create/collections/new',
          state,
        },
      ]}
    >
      <LocationDisplay />
      <Routes>
        <Route
          path="/evaluation/:namespace/create/collections/new"
          element={<ManualCollectionEditorPage mode="create" />}
        />
      </Routes>
    </MemoryRouter>,
  );

const renderEditPage = (collectionId = 'source-collection') =>
  render(
    <MemoryRouter
      initialEntries={[`/evaluation/test-namespace/create/collections/${collectionId}/edit`]}
    >
      <LocationDisplay />
      <Routes>
        <Route
          path="/evaluation/:namespace/create/collections/:collectionId/edit"
          element={<ManualCollectionEditorPage mode="edit" />}
        />
      </Routes>
    </MemoryRouter>,
  );

const goToSelectBenchmarksStep = () => {
  fireEvent.click(screen.getByTestId('copy-suite-next'));
};

const goToBenchmarksStep = () => {
  goToSelectBenchmarksStep();
  fireEvent.click(screen.getByTestId('copy-suite-next-select-benchmarks'));
};

const goToReviewStep = () => {
  goToBenchmarksStep();
  fireEvent.click(screen.getByTestId('copy-suite-next-review'));
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCanCreateCollections.mockReturnValue({ data: true, isError: false, isPending: false });
  mockGetCollection.mockReturnValue(jest.fn());
  mockUseProviders.mockReturnValue({ providers, loaded: true, loadError: undefined });
  mockUseCopySuiteForm.mockReturnValue(makeForm());
});

describe('ManualCollectionEditorPage', () => {
  it('should render the reusable blank create suite flow with a create CTA', () => {
    mockUseFetchState.mockReturnValue([undefined, true, undefined, jest.fn()]);

    renderCreatePage();

    expect(screen.getByTestId('app-page-title')).toHaveTextContent('Create collection');
    expect(screen.getByTestId('suite-name-input')).toHaveAttribute(
      'placeholder',
      'Enter collection name',
    );
    expect(screen.getByTestId('suite-description-input')).toHaveAttribute(
      'placeholder',
      'Enter collection description',
    );
    // TEMP: Keep model-only behavior until EvalHub supports more evaluation_targets; restore this code when support is added.
    /*
    expect(screen.getByTestId('suite-evaluates-tag-agent')).toHaveTextContent('Agent');
    */
    expect(screen.queryByTestId('suite-evaluates-input')).not.toBeInTheDocument();
    expect(screen.getByTestId('copy-suite-description')).toHaveTextContent(
      'Configure your collection, select benchmarks, and review their settings.',
    );
    expect(screen.getByTestId('copy-suite-step-title')).toHaveTextContent('Collection settings');
    expect(screen.getByTestId('copy-suite-step-description')).toHaveTextContent(
      'Set the collection name, description, and category.',
    );
    expect(screen.queryByLabelText('Collection threshold')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Benchmark collections' })).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent(
      'Create collection',
    );
    expect(mockUseCopySuiteForm).toHaveBeenCalledWith(
      expect.objectContaining({ cancelRoute: '/evaluation/test-namespace?tab=evaluate' }),
    );
    goToBenchmarksStep();
    expect(screen.getByTestId('app-page-title')).toHaveTextContent('Create collection');
    expect(screen.getByTestId('copy-suite-description')).toHaveTextContent(
      'Configure your collection, select benchmarks, and review their settings.',
    );
    expect(screen.queryByTestId('copy-suite-benchmarks-description')).not.toBeInTheDocument();
    expect(screen.getByTestId('copy-suite-next-review')).toHaveTextContent('Next');
    expect(screen.queryByTestId('create-suite-submit')).not.toBeInTheDocument();
    expect(screen.getByTestId('copy-suite-back-step-2')).toBeInTheDocument();
    expect(screen.getByTestId('copy-suite-cancel-step-2')).toBeInTheDocument();
    expect(screen.queryByTestId('copy-suite-save-only')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('copy-suite-back-step-2'));
    expect(screen.getByTestId('copy-suite-step-select-benchmarks')).toBeInTheDocument();
    expect(screen.getByTestId('app-page-title')).toHaveTextContent('Create collection');
    expect(screen.getByTestId('copy-suite-description')).toBeInTheDocument();
  });

  it('should review collection and benchmark settings before enabling save actions', () => {
    const pendingCollection: Collection = {
      ...sourceCollection,
      name: 'Answer quality',
      description: 'Check answer relevance and accuracy.',
      domains: ['reasoning'],
      evaluation_targets: ['model'],
      benchmarks: [
        {
          id: 'benchmark-one',
          provider_id: 'provider-one',
          primary_score: { metric: 'accuracy', lower_is_better: false },
          pass_criteria: { threshold: 0.7 },
          parameters: { num_examples: 100 },
        },
      ],
    };
    mockUseCopySuiteForm.mockReturnValue(
      makeForm({ buildPendingCollection: jest.fn(() => pendingCollection) }),
    );
    mockUseFetchState.mockReturnValue([undefined, true, undefined, jest.fn()]);

    renderCreatePage();
    goToReviewStep();

    expect(screen.getByTestId('copy-suite-review-name')).toHaveTextContent('Answer quality');
    expect(screen.getByTestId('copy-suite-review-description')).toHaveTextContent(
      'Check answer relevance and accuracy.',
    );
    expect(screen.getByTestId('copy-suite-review-categories')).toHaveTextContent('Reasoning');
    expect(screen.getByTestId('copy-suite-review-evaluates')).toHaveTextContent('Model');
    expect(
      screen.queryByRole('heading', { level: 3, name: 'Generation settings' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Benchmarks' })).toBeInTheDocument();

    const reviewedBenchmarks = screen.getByTestId('copy-suite-review-benchmarks');
    expect(reviewedBenchmarks).toHaveTextContent('benchmark-one');
    expect(reviewedBenchmarks).toHaveTextContent('Provider One');
    expect(reviewedBenchmarks).toHaveTextContent('Accuracy');
    expect(reviewedBenchmarks).toHaveTextContent('70%');
    expect(reviewedBenchmarks).toHaveTextContent('Num examples');
    expect(reviewedBenchmarks).toHaveTextContent('100');
    expect(screen.getByTestId('copy-suite-back-review')).toBeInTheDocument();
    expect(screen.getByTestId('copy-suite-cancel-step-2')).toBeInTheDocument();
    expect(screen.getByTestId('create-suite-submit')).toHaveTextContent('Save and run');
    expect(screen.getByTestId('copy-suite-save-only')).toHaveTextContent('Add to my collections');
  });

  it('should disable create saves when collection creation is not permitted', () => {
    mockUseCanCreateCollections.mockReturnValue({ data: false, isError: false, isPending: false });
    const form = makeForm();
    mockUseCopySuiteForm.mockReturnValue(form);
    mockUseFetchState.mockReturnValue([undefined, true, undefined, jest.fn()]);

    renderCreatePage();
    goToReviewStep();

    expect(screen.getByTestId('create-suite-submit')).toBeDisabled();
    expect(screen.getByTestId('copy-suite-save-only')).toBeDisabled();
    fireEvent.click(screen.getByTestId('create-suite-submit'));
    fireEvent.click(screen.getByTestId('copy-suite-save-only'));
    expect(form.handleSaveAndRun).not.toHaveBeenCalled();
    expect(form.handleSaveOnly).not.toHaveBeenCalled();
  });

  it('should keep edit saves available when create permission is not needed', () => {
    mockUseCanCreateCollections.mockReturnValue({ data: false, isError: false, isPending: false });
    const form = makeForm();
    mockUseCopySuiteForm.mockReturnValue(form);
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);

    renderEditPage();
    goToReviewStep();

    expect(screen.getByTestId('edit-suite-save-and-run')).toBeEnabled();
    expect(screen.getByTestId('copy-suite-save-only')).toBeEnabled();
    fireEvent.click(screen.getByTestId('copy-suite-save-only'));
    expect(form.handleSaveOnly).toHaveBeenCalledTimes(1);
  });

  it('should use the Evaluate tab as the source when explicitly provided', () => {
    mockUseFetchState.mockReturnValue([
      {
        ...sourceCollection,
        // eslint-disable-next-line camelcase
        evaluation_targets: ['model'],
      },
      true,
      undefined,
      jest.fn(),
    ]);

    renderEvaluateOriginPage();

    expect(screen.getByRole('link', { name: 'Benchmark collections' })).toHaveAttribute(
      'href',
      '/evaluation/test-namespace?tab=evaluate',
    );
    expect(screen.queryByRole('link', { name: 'Model collections' })).not.toBeInTheDocument();
    expect(mockUseCopySuiteForm).toHaveBeenCalledWith(
      expect.objectContaining({ cancelRoute: '/evaluation/test-namespace?tab=evaluate' }),
    );
  });

  it('should wire create and run and create only to their respective handlers', () => {
    const form = makeForm();
    mockUseCopySuiteForm.mockReturnValue(form);
    mockUseFetchState.mockReturnValue([undefined, true, undefined, jest.fn()]);

    renderCreatePage();
    goToReviewStep();

    fireEvent.click(screen.getByTestId('create-suite-submit'));
    fireEvent.click(screen.getByTestId('copy-suite-save-only'));

    expect(form.handleSaveAndRun).toHaveBeenCalledTimes(1);
    expect(form.handleSaveOnly).toHaveBeenCalledTimes(1);
  });

  it('should navigate to the Runs tab after successfully running a created suite', () => {
    const form = makeForm();
    mockUseCopySuiteForm.mockImplementation((options) => ({
      ...form,
      handleSaveAndRun: () => options.onSaveAndRunRequest?.(),
    }));
    mockUseFetchState.mockReturnValue([undefined, true, undefined, jest.fn()]);

    renderCreatePage();
    goToReviewStep();
    fireEvent.click(screen.getByTestId('create-suite-submit'));
    fireEvent.click(screen.getByTestId('copy-suite-run-success'));

    expect(screen.getByTestId('location-display')).toHaveTextContent(
      '/evaluation/test-namespace?tab=runs',
    );
  });

  it('should pass the pending created suite to the start evaluation modal', () => {
    const pendingCollection: Collection = {
      ...sourceCollection,
      name: 'New suite',
    };
    const form = makeForm({
      buildPendingCollection: jest.fn(() => pendingCollection),
    });
    mockUseCopySuiteForm.mockImplementation((options) => ({
      ...form,
      handleSaveAndRun: () => options.onSaveAndRunRequest?.(),
    }));
    mockUseFetchState.mockReturnValue([undefined, true, undefined, jest.fn()]);

    renderCreatePage();
    goToReviewStep();
    fireEvent.click(screen.getByTestId('create-suite-submit'));

    expect(screen.getByTestId('copy-suite-run-collection')).toHaveTextContent('New suite');
  });

  it('should show a loading state while the collection is loading', () => {
    mockUseFetchState.mockReturnValue([undefined, false, undefined, jest.fn()]);

    renderPage();

    expect(screen.getByLabelText('Loading collection')).toBeInTheDocument();
    expect(screen.queryByTestId('copy-suite-form')).not.toBeInTheDocument();
  });

  it('should show an error state when the source collection cannot be loaded', () => {
    mockUseFetchState.mockReturnValue([
      undefined,
      true,
      new Error('Collection not found'),
      jest.fn(),
    ]);

    renderPage();

    expect(screen.getByTestId('copy-suite-load-error')).toHaveTextContent('Collection not found');
    expect(screen.getByRole('link', { name: 'Return to evaluations' })).toHaveAttribute(
      'href',
      '/evaluation/test-namespace?tab=evaluate',
    );
  });

  it('should show an error state when providers cannot be loaded', () => {
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);
    mockUseProviders.mockReturnValue({
      providers: [],
      loaded: false,
      loadError: new Error('Providers unavailable'),
    });

    renderPage();

    expect(screen.getByTestId('copy-suite-load-error')).toHaveTextContent('Providers unavailable');
    expect(screen.queryByLabelText('Loading collection')).not.toBeInTheDocument();
  });

  it('should fetch the collection using the route namespace and id', async () => {
    const fetcher = jest.fn().mockResolvedValue(sourceCollection);
    mockGetCollection.mockReturnValue(fetcher);
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);

    renderPage();

    const [fetchCollection] = mockUseFetchState.mock.calls[0] as unknown as [
      (opts: unknown) => Promise<Collection>,
    ];
    const options = { signal: new AbortController().signal };
    await fetchCollection(options);

    expect(mockGetCollection).toHaveBeenCalledWith('', 'test-namespace', 'source-collection');
    expect(fetcher).toHaveBeenCalledWith(options);
  });

  it('should render the settings step and breadcrumb when loaded', () => {
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);

    renderPage();

    expect(screen.getByTestId('app-page-title')).toHaveTextContent('Copy collection');
    expect(screen.getByTestId('copy-suite-description')).toBeInTheDocument();
    expect(screen.getByTestId('suite-name-input')).toHaveValue('Curated suite copy');
    expect(screen.getByTestId('suite-description-input')).toHaveValue('Description');
    expect(screen.queryByTestId('suite-category-toggle')).not.toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    // TEMP: Keep model-only behavior until EvalHub supports more evaluation_targets; restore this code when support is added.
    /*
    expect(screen.getByTestId('suite-evaluates-tag-agent')).toHaveTextContent('Agent');
    */
    expect(screen.queryByTestId('suite-evaluates-input')).not.toBeInTheDocument();
    expect(screen.getByTestId('suite-domains-tag-reasoning')).toHaveTextContent('Reasoning');
    expect(screen.getByTestId('suite-domains-tag-trustworthiness')).toHaveTextContent(
      'Trustworthiness',
    );
    /*
    expect(screen.getByTestId('suite-tasks-tag-text-generation')).toHaveTextContent(
      'Text generation',
    );
    expect(screen.getByTestId('suite-modalities-tag-text')).toHaveTextContent('Text');
    expect(screen.getByTestId('suite-industries-tag-technology')).toHaveTextContent('Technology');
    */
    expect(screen.queryByText('Language collections')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Model collections' })).not.toBeInTheDocument();
    expect(screen.getByTestId('copy-suite-next')).toBeInTheDocument();
    expect(screen.queryByTestId('copy-suite-prerequisite-alert')).not.toBeInTheDocument();
    expect(screen.getByTestId('copy-suite-cancel')).toBeInTheDocument();
    expect(screen.queryByTestId('copy-suite-save-and-run')).not.toBeInTheDocument();
  });

  it.each([
    ['trustworthiness-v1', 'Requires a judge model in addition to the model you are evaluating.'],
    ['tool-use-v1', 'The model you are evaluating must support multiple tool/function calls.'],
    [
      'multimodal-v1',
      'The model you are evaluating must be a vision-language model that supports image inputs.',
    ],
  ])('should show the prerequisite warning for %s', (collectionId, prerequisite) => {
    const requiresJudgeModel = collectionId === 'trustworthiness-v1';
    mockUseFetchState.mockReturnValue([
      {
        ...sourceCollection,
        resource: { ...sourceCollection.resource, id: collectionId },
        benchmarks: sourceCollection.benchmarks?.map((sourceBenchmark, index) =>
          requiresJudgeModel && index === 0
            ? { ...sourceBenchmark, parameters: { ...sourceBenchmark.parameters, judge_model: '' } }
            : sourceBenchmark,
        ),
      },
      true,
      undefined,
      jest.fn(),
    ]);

    renderPage(collectionId);

    expect(screen.getByTestId('copy-suite-prerequisite-alert')).toHaveTextContent(prerequisite);
    expect(screen.getByTestId('copy-suite-next')).not.toBeDisabled();
  });

  it('should not show curated prerequisites while editing a tenant collection', () => {
    mockUseFetchState.mockReturnValue([
      {
        ...sourceCollection,
        resource: { id: 'trustworthiness-v1', tenant: 'test-tenant' },
      },
      true,
      undefined,
      jest.fn(),
    ]);

    renderEditPage('trustworthiness-v1');

    expect(screen.getByTestId('app-page-title')).toHaveTextContent('Edit collection');
    expect(screen.getByRole('navigation', { name: 'Collection creation steps' })).toHaveTextContent(
      'Benchmark settings',
    );
    expect(screen.queryByTestId('copy-suite-prerequisite-alert')).not.toBeInTheDocument();
  });

  it('should not show curated prerequisites when copying a tenant collection from benchmark suites', () => {
    mockUseFetchState.mockReturnValue([
      {
        ...sourceCollection,
        resource: { id: 'trustworthiness-v1', tenant: 'test-tenant' },
      },
      true,
      undefined,
      jest.fn(),
    ]);

    renderBenchmarkSuitesOriginPage('trustworthiness-v1');

    expect(screen.getByTestId('copy-suite-step-settings')).toBeInTheDocument();
    expect(screen.queryByTestId('copy-suite-prerequisite-alert')).not.toBeInTheDocument();
  });

  it('should link to the originating curated suite page when evaluation target metadata is available', () => {
    mockUseFetchState.mockReturnValue([
      {
        ...sourceCollection,
        // eslint-disable-next-line camelcase
        evaluation_targets: ['model'],
      },
      true,
      undefined,
      jest.fn(),
    ]);

    renderPage();

    expect(screen.getByRole('link', { name: 'Model collections' })).toHaveAttribute(
      'href',
      '/evaluation/test-namespace/collections/model',
    );
  });

  it('should show the gallery breadcrumb and return route when opened from the gallery', () => {
    mockUseFetchState.mockReturnValue([
      {
        ...sourceCollection,
        // eslint-disable-next-line camelcase
        evaluation_targets: ['model'],
      },
      true,
      undefined,
      jest.fn(),
    ]);

    renderGalleryOriginPage();

    expect(screen.getByRole('link', { name: 'Gallery' })).toHaveAttribute(
      'href',
      '/evaluation/test-namespace?tab=gallery',
    );
    expect(screen.queryByRole('link', { name: 'Model collections' })).not.toBeInTheDocument();
    expect(mockUseCopySuiteForm).toHaveBeenCalledWith(
      expect.objectContaining({ cancelRoute: '/evaluation/test-namespace?tab=gallery' }),
    );
  });

  it('should show the tenant benchmark suites breadcrumb and return route when opened from there', () => {
    mockUseFetchState.mockReturnValue([
      {
        ...sourceCollection,
        // eslint-disable-next-line camelcase
        evaluation_targets: ['model'],
      },
      true,
      undefined,
      jest.fn(),
    ]);

    renderBenchmarkSuitesOriginPage();

    expect(screen.getByRole('link', { name: 'Benchmark collections' })).toHaveAttribute(
      'href',
      '/evaluation/test-namespace?tab=evaluate',
    );
    expect(screen.getByRole('link', { name: 'My benchmark collections' })).toHaveAttribute(
      'href',
      '/evaluation/test-namespace/collections',
    );
    expect(screen.queryByRole('link', { name: 'Model collections' })).not.toBeInTheDocument();
    expect(mockUseCopySuiteForm).toHaveBeenCalledWith(
      expect.objectContaining({ cancelRoute: '/evaluation/test-namespace/collections' }),
    );
  });

  it('should preserve the Gallery source when creating a suite', () => {
    mockUseFetchState.mockReturnValue([undefined, true, undefined, jest.fn()]);

    renderCreatePage(evaluationGalleryNavigationState);

    expect(screen.getByRole('link', { name: 'Gallery' })).toHaveAttribute(
      'href',
      '/evaluation/test-namespace?tab=gallery',
    );
    expect(mockUseCopySuiteForm).toHaveBeenCalledWith(
      expect.objectContaining({ cancelRoute: '/evaluation/test-namespace?tab=gallery' }),
    );
  });

  it('should preserve the tenant benchmark suites source when creating a suite', () => {
    mockUseFetchState.mockReturnValue([undefined, true, undefined, jest.fn()]);

    renderCreatePage(evaluationBenchmarkSuitesNavigationState);

    expect(screen.getByRole('link', { name: 'My benchmark collections' })).toHaveAttribute(
      'href',
      '/evaluation/test-namespace/collections',
    );
    expect(mockUseCopySuiteForm).toHaveBeenCalledWith(
      expect.objectContaining({ cancelRoute: '/evaluation/test-namespace/collections' }),
    );
  });

  it('should preserve a curated source when creating a suite', () => {
    mockUseFetchState.mockReturnValue([undefined, true, undefined, jest.fn()]);

    renderCreatePage({ sourceEvaluationTarget: 'model' });

    expect(screen.getByRole('link', { name: 'Model collections' })).toHaveAttribute(
      'href',
      '/evaluation/test-namespace/collections/model',
    );
    expect(mockUseCopySuiteForm).toHaveBeenCalledWith(
      expect.objectContaining({ cancelRoute: '/evaluation/test-namespace/collections/model' }),
    );
  });

  it('should render selected categories as labels', () => {
    mockUseCopySuiteForm.mockReturnValue(makeForm({ suiteDomains: ['reasoning'] }));
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);

    renderPage();

    expect(screen.getByTestId('suite-domains-tag-reasoning')).toHaveTextContent('Reasoning');
  });

  // TEMP: Keep model-only behavior until EvalHub supports more evaluation_targets; restore this code when support is added.
  /*
  it('should render selected evaluation targets as labels', () => {
    mockUseCopySuiteForm.mockReturnValue(makeForm({ suiteEvaluates: ['agent', 'model'] }));
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);

    renderPage();

    expect(screen.getByTestId('suite-evaluates-tag-agent')).toHaveTextContent('Agent');
    expect(screen.getByTestId('suite-evaluates-tag-model')).toHaveTextContent('Model');
  });
  */

  it('should hide the evaluation target field', () => {
    mockUseCopySuiteForm.mockReturnValue(makeForm({ suiteEvaluates: ['agent', 'model'] }));
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);

    renderPage();

    expect(screen.queryByTestId('suite-evaluates-input')).not.toBeInTheDocument();
  });

  // TEMP: Keep model-only behavior until EvalHub supports more evaluation_targets; restore this code when support is added.
  /*
  it('should only show backend-supported evaluation targets in the menu', () => {
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);

    renderPage();

    fireEvent.click(screen.getByTestId('suite-evaluates-input'));

    expect(screen.getByTestId('suite-evaluates-option-agent')).toBeInTheDocument();
    expect(screen.getByTestId('suite-evaluates-option-model')).toBeInTheDocument();
    expect(screen.queryByTestId('suite-evaluates-option-guardrails')).not.toBeInTheDocument();
    expect(screen.queryByTestId('suite-evaluates-option-traces')).not.toBeInTheDocument();
  });
  */

  it('should not render an evaluation target menu', () => {
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);

    renderPage();

    expect(screen.queryByTestId('suite-evaluates-input')).not.toBeInTheDocument();
  });

  it('should associate metadata labels with their multi-select controls', () => {
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);

    renderPage();

    // TEMP: Keep model-only behavior until EvalHub supports more evaluation_targets; restore this code when support is added.
    /*
    expect(screen.getByLabelText('Evaluates')).toHaveAttribute(
      'data-testid',
      'suite-evaluates-input',
    );
    */
    expect(screen.queryByTestId('suite-evaluates-input')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toHaveAttribute('data-testid', 'suite-domains-input');
    /*
    expect(screen.getByLabelText('Tasks')).toHaveAttribute('data-testid', 'suite-tasks-input');
    expect(screen.getByLabelText('Modalities')).toHaveAttribute(
      'data-testid',
      'suite-modalities-input',
    );
    expect(screen.getByLabelText('Industries')).toHaveAttribute(
      'data-testid',
      'suite-industries-input',
    );
    */
  });

  it('should only show categories supported by the category icons', () => {
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);

    renderPage();
    fireEvent.click(screen.getByTestId('suite-domains-input'));

    expect(
      screen.getByTestId('suite-domains-option-grounded_document_understanding'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('suite-domains-option-instruction_and_output_reliability'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('suite-domains-option-knowledge_and_reasoning')).toBeInTheDocument();
    expect(screen.getByTestId('suite-domains-option-multilingual')).toBeInTheDocument();
    expect(screen.getByTestId('suite-domains-option-multimodal')).toBeInTheDocument();
    expect(screen.getByTestId('suite-domains-option-software')).toBeInTheDocument();
    expect(
      screen.getByTestId('suite-domains-option-tool_use_and_function_calling'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('suite-domains-option-trustworthiness')).toBeInTheDocument();
  });

  /*
  it('should filter metadata options from the search input', () => {
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);

    renderPage();
    fireEvent.click(screen.getByTestId('suite-tasks-input'));
    fireEvent.change(screen.getByTestId('suite-tasks-input'), {
      target: { value: 'chart' },
    });

    expect(screen.getByTestId('suite-tasks-option-document_chart_vqa')).toBeInTheDocument();
    expect(screen.queryByTestId('suite-tasks-option-code_generation')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('suite-tasks-input'));
  });
  */

  it('should add and remove metadata values when selecting options', () => {
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);
    const form = makeForm({ suiteDomains: ['reasoning'] });
    mockUseCopySuiteForm.mockReturnValue(form);

    renderPage();
    fireEvent.click(screen.getByTestId('suite-domains-input'));
    fireEvent.click(
      within(screen.getByTestId('suite-domains-option-multimodal')).getByRole('checkbox'),
    );

    expect(form.form.getValues('suiteDomains')).toEqual(['reasoning', 'multimodal']);

    fireEvent.click(
      within(screen.getByTestId('suite-domains-option-multimodal')).getByRole('checkbox'),
    );

    expect(form.form.getValues('suiteDomains')).toEqual(['reasoning']);
  });

  it('should expand selected categories and remove a hidden category without closing the select', () => {
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);
    const categories = [...COLLECTION_METADATA_OPTIONS.domains];
    const form = makeForm({ suiteDomains: categories });
    mockUseCopySuiteForm.mockReturnValue(form);

    renderPage();

    expect(screen.getByTestId('suite-domains-input')).toHaveAttribute('placeholder', '8 selected');
    fireEvent.click(screen.getByTestId('suite-domains-input'));
    expect(
      screen.getByTestId('suite-domains-option-grounded_document_understanding'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '5 more' }));

    const hiddenCategory = 'trustworthiness';
    expect(screen.getByTestId(`suite-domains-tag-${hiddenCategory}`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show Less' })).toBeInTheDocument();

    fireEvent.click(
      within(screen.getByTestId(`suite-domains-tag-${hiddenCategory}`)).getByRole('button'),
    );

    expect(form.form.getValues('suiteDomains')).toEqual(categories.slice(0, -1));
    expect(screen.queryByTestId(`suite-domains-tag-${hiddenCategory}`)).not.toBeInTheDocument();
    expect(
      screen.getByTestId('suite-domains-option-grounded_document_understanding'),
    ).toBeInTheDocument();
  });

  it('should allow the final selected metadata value to be removed', () => {
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);
    const form = makeForm({ suiteDomains: ['reasoning'] });
    mockUseCopySuiteForm.mockReturnValue(form);

    renderPage();
    fireEvent.click(within(screen.getByTestId('suite-domains-tag-reasoning')).getByRole('button'));

    expect(screen.queryByTestId('suite-domains-tag-reasoning')).not.toBeInTheDocument();
    expect(screen.getByTestId('suite-domains-input')).toHaveAttribute(
      'placeholder',
      'Select category',
    );
    expect(form.form.getValues('suiteDomains')).toEqual([]);
  });

  it('should pass metadata events on the settings step and save events on the benchmarks step', () => {
    const form = makeForm();
    mockUseCopySuiteForm.mockReturnValue(form);
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);

    renderPage();

    fireEvent.change(screen.getByTestId('suite-name-input'), {
      target: { value: 'Updated suite' },
    });
    fireEvent.change(screen.getByTestId('suite-description-input'), {
      target: { value: 'Updated description' },
    });
    // TEMP: Keep model-only behavior until EvalHub supports more evaluation_targets; restore this code when support is added.
    /*
    fireEvent.click(screen.getByTestId('suite-evaluates-input'));
    fireEvent.click(
      within(screen.getByTestId('suite-evaluates-option-model')).getByRole('checkbox'),
    );
    fireEvent.click(screen.getByTestId('suite-evaluates-input'));
    */
    fireEvent.click(screen.getByTestId('suite-domains-input'));
    fireEvent.click(
      within(screen.getByTestId('suite-domains-option-knowledge_and_reasoning')).getByRole(
        'checkbox',
      ),
    );
    fireEvent.click(screen.getByTestId('suite-domains-input'));
    fireEvent.click(
      within(screen.getByTestId('suite-domains-tag-trustworthiness')).getByRole('button'),
    );

    /*
    fireEvent.click(screen.getByTestId('suite-tasks-input'));
    fireEvent.click(
      within(screen.getByTestId('suite-tasks-option-reasoning')).getByRole('checkbox'),
    );
    fireEvent.click(screen.getByTestId('suite-tasks-input'));

    fireEvent.click(screen.getByTestId('suite-modalities-input'));
    fireEvent.click(
      within(screen.getByTestId('suite-modalities-option-vision')).getByRole('checkbox'),
    );
    fireEvent.click(screen.getByTestId('suite-modalities-input'));

    fireEvent.click(screen.getByTestId('suite-industries-input'));
    fireEvent.click(
      within(screen.getByTestId('suite-industries-option-health')).getByRole('checkbox'),
    );
    fireEvent.click(screen.getByTestId('suite-industries-input'));
    */
    fireEvent.click(screen.getByTestId('copy-suite-cancel'));
    expect(form.handleCancel).toHaveBeenCalledTimes(1);

    goToReviewStep();

    expect(screen.getByTestId('app-page-title')).toHaveTextContent('Copy collection');
    expect(screen.getByTestId('copy-suite-review-step')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('copy-suite-save-and-run'));
    fireEvent.click(screen.getByTestId('copy-suite-save-only'));
    fireEvent.click(screen.getByTestId('copy-suite-cancel-step-2'));

    expect(form.form.getValues('suiteName')).toBe('Updated suite');
    expect(form.form.getValues('suiteDescription')).toBe('Updated description');
    // TEMP: Keep model-only behavior until EvalHub supports more evaluation_targets; restore this code when support is added.
    /*
    expect(form.form.getValues('suiteEvaluates')).toEqual(['agent', 'model']);
    */
    expect(form.form.getValues('suiteEvaluates')).toEqual(['model']);
    expect(form.form.getValues('suiteDomains')).toEqual(['reasoning', 'knowledge_and_reasoning']);
    /*
    expect(form.form.getValues('suiteTasks')).toEqual(['text-generation', 'reasoning']);
    expect(form.form.getValues('suiteModalities')).toEqual(['text', 'vision']);
    expect(form.form.getValues('suiteIndustries')).toEqual(['technology', 'health']);
    */
    expect(form.handleSaveAndRun).toHaveBeenCalledTimes(1);
    expect(form.handleSaveOnly).toHaveBeenCalledTimes(1);
    expect(form.handleCancel).toHaveBeenCalledTimes(2);
  });

  it('should disable the next action when settings are invalid', () => {
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);
    mockUseCopySuiteForm.mockReturnValue(makeForm({ suiteName: '' }));

    renderPage();

    expect(screen.getByTestId('copy-suite-next')).toBeDisabled();
  });

  it('should require a copied suite to have a different name from its source collection', async () => {
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);
    const form = makeForm({ suiteName: sourceCollection.name });
    await act(async () => {
      await form.form.trigger('suiteName');
    });
    mockUseCopySuiteForm.mockReturnValue(form);

    renderPage();

    expect(
      screen.getByText('Collection name must be different from the source collection name.'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('copy-suite-next')).toBeDisabled();
  });

  it('should require a category before continuing from both suite settings flows', () => {
    mockUseCopySuiteForm.mockReturnValue(makeForm({ suiteDomains: [] }));
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);

    const copyPage = renderPage();
    expect(screen.getByTestId('copy-suite-next')).toBeDisabled();

    copyPage.unmount();
    mockUseFetchState.mockReturnValue([undefined, true, undefined, jest.fn()]);
    renderCreatePage();

    expect(screen.getByTestId('copy-suite-next')).toBeDisabled();
  });

  it('should show the category validation error from the form schema', async () => {
    const form = makeForm({ suiteDomains: [] });
    await act(async () => {
      await form.form.trigger('suiteDomains');
    });
    mockUseCopySuiteForm.mockReturnValue(form);
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);

    renderPage();

    expect(screen.getByText('At least one category is required')).toBeInTheDocument();
    expect(screen.getByTestId('copy-suite-next')).toBeDisabled();
  });

  it('should keep Benchmarks disabled until the name and category are valid', () => {
    mockUseCopySuiteForm.mockReturnValue(makeForm({ suiteName: '', suiteDomains: [] }));
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);

    renderPage();

    expect(screen.getByTestId('copy-suite-next')).toBeDisabled();
    expect(screen.getByRole('button', { name: /Benchmarks/ })).toBeDisabled();
    expect(screen.getAllByRole('button', { name: 'Next' })).toHaveLength(1);
  });

  it('should keep Benchmark settings disabled when no benchmarks are selected', () => {
    mockUseCopySuiteForm.mockReturnValue(makeForm({ benchmarks: [], isValid: false }));
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);

    renderPage();
    goToSelectBenchmarksStep();

    expect(screen.getByTestId('copy-suite-next-select-benchmarks')).toBeDisabled();
    expect(screen.getByRole('button', { name: /Benchmark settings/ })).toBeDisabled();
  });

  it('should allow sidebar navigation to each eligible next step before visiting it', () => {
    mockUseCopySuiteForm.mockReturnValue(makeForm());
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);

    renderPage();

    expect(screen.getByTestId('copy-suite-next')).toBeEnabled();
    const selectionStep = screen.getByRole('button', { name: /Benchmarks/ });
    expect(selectionStep).toBeEnabled();
    fireEvent.click(selectionStep);

    expect(screen.getByTestId('copy-suite-next-select-benchmarks')).toBeEnabled();
    const benchmarkSettingsStep = screen.getByRole('button', { name: /Benchmark settings/ });
    expect(benchmarkSettingsStep).toBeEnabled();
    fireEvent.click(benchmarkSettingsStep);

    expect(screen.getByTestId('copy-suite-next-review')).toBeEnabled();
    const reviewStep = screen.getByRole('button', { name: /Review/ });
    expect(reviewStep).toBeEnabled();

    fireEvent.click(reviewStep);
    expect(screen.getByTestId('copy-suite-review-step')).toBeInTheDocument();
  });

  it('should preserve settings while navigating through visited sidebar steps', () => {
    const rhfForm = createRhfForm(defaultFormValues);
    mockUseCopySuiteForm.mockImplementation(() => {
      const [suiteName, setSuiteName] = React.useState(defaultFormValues.suiteName);
      const [suiteDescription, setSuiteDescription] = React.useState(
        defaultFormValues.suiteDescription,
      );
      return makeForm({
        form: rhfForm,
        suiteName,
        setSuiteName,
        suiteDescription,
        setSuiteDescription,
      });
    });
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);

    renderPage();

    const stepNavigation = screen.getByRole('navigation', {
      name: 'Collection creation steps',
    });
    expect(stepNavigation).toHaveTextContent('Collection settings');
    expect(stepNavigation).toHaveTextContent('Benchmarks');
    expect(stepNavigation).toHaveTextContent('Benchmark settings');
    expect(stepNavigation).toHaveTextContent('Review');

    fireEvent.change(screen.getByTestId('suite-name-input'), {
      target: { value: 'Edited collection name' },
    });
    fireEvent.change(screen.getByTestId('suite-description-input'), {
      target: { value: 'Edited collection description' },
    });
    fireEvent.click(screen.getByTestId('copy-suite-next'));
    fireEvent.click(screen.getByRole('button', { name: /Collection settings/ }));

    expect(screen.getByTestId('suite-name-input')).toHaveValue('Edited collection name');
    expect(screen.getByTestId('suite-description-input')).toHaveValue(
      'Edited collection description',
    );

    fireEvent.click(screen.getByRole('button', { name: /Benchmarks/ }));
    expect(screen.getByTestId('copy-suite-step-select-benchmarks')).toBeInTheDocument();
  });

  it('should prevent continuing to review when the form is invalid', () => {
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);
    mockUseCopySuiteForm.mockReturnValue(makeForm({ isValid: false }));

    renderPage();
    goToBenchmarksStep();

    expect(screen.getByTestId('copy-suite-next-review')).toBeDisabled();
    expect(screen.getByRole('button', { name: /Review/ })).toBeDisabled();
  });

  it('should navigate through the select benchmarks step before configuration', () => {
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);

    renderPage();
    goToSelectBenchmarksStep();

    expect(screen.getByTestId('copy-suite-step-select-benchmarks')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Benchmarks/ })).toHaveAttribute(
      'aria-current',
      'step',
    );

    fireEvent.click(screen.getByTestId('copy-suite-next-select-benchmarks'));
    expect(screen.getByTestId('copy-suite-step-benchmarks')).toBeInTheDocument();
    expect(screen.queryByTestId('copy-suite-add-benchmarks-btn')).not.toBeInTheDocument();
  });

  it('should keep the action breadcrumb static while navigating wizard steps', () => {
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);

    renderPage();
    goToSelectBenchmarksStep();

    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    const dividerCount = breadcrumb.querySelectorAll('.pf-v6-c-breadcrumb__item-divider').length;

    fireEvent.click(screen.getByTestId('copy-suite-next-select-benchmarks'));
    expect(breadcrumb.querySelectorAll('.pf-v6-c-breadcrumb__item-divider')).toHaveLength(
      dividerCount,
    );
  });

  it('should navigate back to settings from the benchmark selection footer', () => {
    mockUseFetchState.mockReturnValue([undefined, true, undefined, jest.fn()]);

    renderCreatePage();
    goToSelectBenchmarksStep();

    fireEvent.click(screen.getByTestId('copy-suite-back-select-benchmarks'));
    expect(screen.getByTestId('copy-suite-form')).toBeInTheDocument();
  });

  it('should navigate back to settings through the benchmark selection footer', () => {
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);

    renderPage();
    goToBenchmarksStep();
    expect(screen.queryByTestId('copy-suite-form')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('copy-suite-back-step-2'));
    fireEvent.click(screen.getByTestId('copy-suite-back-select-benchmarks'));
    expect(screen.getByTestId('copy-suite-form')).toBeInTheDocument();
  });

  it('should navigate back to settings from the benchmarks footer', () => {
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);

    renderPage();
    goToBenchmarksStep();
    fireEvent.click(screen.getByTestId('copy-suite-back-step-2'));

    expect(screen.getByTestId('copy-suite-step-select-benchmarks')).toBeInTheDocument();
  });

  it('should disable editing and breadcrumb navigation while a clone is pending', () => {
    const form = makeForm();
    mockUseCopySuiteForm.mockImplementation((options) => ({
      ...form,
      handleSaveAndRun: () => options.onSaveAndRunRequest?.(),
    }));
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);

    renderPage();
    goToReviewStep();
    fireEvent.click(screen.getByTestId('copy-suite-save-and-run'));
    fireEvent.click(screen.getByTestId('copy-suite-set-clone-pending'));

    expect(screen.getByTestId('copy-suite-review-step')).toBeInTheDocument();
    expect(screen.getByTestId('copy-suite-back-review')).toBeDisabled();
    expect(screen.getByTestId('copy-suite-save-and-run')).toBeDisabled();
    expect(screen.getByTestId('copy-suite-save-only')).toBeDisabled();
    expect(screen.getByTestId('copy-suite-cancel-step-2')).toBeDisabled();
    expect(screen.getByTestId('copy-suite-breadcrumb-evaluations')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByTestId('copy-suite-breadcrumb-evaluations')).not.toHaveAttribute('href');
    fireEvent.click(screen.getByTestId('copy-suite-breadcrumb-evaluations'));
    expect(screen.getByTestId('copy-suite-review-step')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('copy-suite-set-clone-complete'));
    fireEvent.click(screen.getByTestId('copy-suite-back-review'));
    expect(screen.getByTestId('benchmark-0-parameter-input-num_examples')).toBeEnabled();
    expect(screen.getByTestId('copy-suite-breadcrumb-evaluations')).toHaveAttribute('href');
    expect(screen.queryByTestId('benchmark-jump-link-0')).not.toBeInTheDocument();
  });

  it('should block step navigation while a save-only operation is pending', () => {
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);
    mockUseCopySuiteForm.mockReturnValue(makeForm({ isSubmitting: true }));

    renderPage();

    expect(screen.getByTestId('copy-suite-next')).toBeDisabled();
    expect(screen.getByTestId('copy-suite-cancel')).toBeDisabled();
    expect(screen.getByRole('button', { name: /Benchmarks/ })).toBeDisabled();
    expect(screen.getByTestId('copy-suite-breadcrumb-evaluations')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByTestId('copy-suite-breadcrumb-evaluations')).not.toHaveAttribute('href');

    expect(screen.getByTestId('copy-suite-step-settings')).toBeInTheDocument();
  });

  it('should close benchmark details and weight overlays when leaving benchmark settings', () => {
    const secondBenchmark = {
      ...benchmark,
      id: 'benchmark-two',
      providerId: 'provider-two',
      name: 'Benchmark Two',
      weight: 0.5,
    };
    const form = makeForm({ benchmarks: [{ ...benchmark, weight: 0.5 }, secondBenchmark] });
    mockUseCopySuiteForm.mockImplementation((options) => ({
      ...form,
      handleSaveAndRun: () => options.onSaveAndRunRequest?.(),
    }));
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);

    renderPage();
    goToBenchmarksStep();
    fireEvent.click(screen.getByTestId('benchmark-section-name-0'));
    expect(screen.getByTestId('copy-suite-benchmark-details-overlay')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('copy-suite-next-review'));
    expect(screen.queryByTestId('copy-suite-benchmark-details-overlay')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('copy-suite-back-review'));
    fireEvent.click(screen.getByTestId('benchmark-weight-edit-0'));
    expect(screen.getByTestId('copy-suite-benchmark-weights-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('copy-suite-next-review'));
    expect(screen.queryByTestId('copy-suite-benchmark-weights-modal')).not.toBeInTheDocument();
  });
});
