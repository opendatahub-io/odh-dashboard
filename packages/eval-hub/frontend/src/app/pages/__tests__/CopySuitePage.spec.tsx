import * as React from 'react';
import { fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useFetchState } from 'mod-arch-core';
import { getCollection } from '~/app/api/k8s';
import { useProviders } from '~/app/hooks/useProviders';
import { useCopySuiteForm, type CopySuiteBenchmark } from '~/app/pages/useCopySuiteForm';
import CopySuitePage, { CreateSuitePage } from '~/app/pages/CopySuitePage';
import { copySuiteSchema, type CopySuiteFormValues } from '~/app/schemas/copySuite.schema';
import type { Collection, Provider } from '~/app/types';

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

jest.mock('~/app/pages/useCopySuiteForm', () => ({
  MAX_BENCHMARKS: 10,
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
  default: ({
    selectedBenchmarkKeys,
    isInteractionDisabled,
    onNext,
    onBack,
    onCancel,
  }: {
    selectedBenchmarkKeys: string[];
    isInteractionDisabled?: boolean;
    onNext: (selectedKeys: string[]) => void;
    onBack: () => void;
    onCancel: () => void;
  }) => (
    <div data-testid="copy-suite-step-select-benchmarks">
      <button
        type="button"
        data-testid="copy-suite-next-select-benchmarks"
        disabled={isInteractionDisabled || selectedBenchmarkKeys.length === 0}
        onClick={() => onNext(selectedBenchmarkKeys)}
      >
        Next
      </button>
      <button
        type="button"
        data-testid="copy-suite-back-select-benchmarks"
        disabled={isInteractionDisabled}
        onClick={onBack}
      >
        Back
      </button>
      <button
        type="button"
        data-testid="copy-suite-cancel-select-benchmarks"
        disabled={isInteractionDisabled}
        onClick={onCancel}
      >
        Cancel
      </button>
    </div>
  ),
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
    onClonePendingChange,
    onSuccess,
  }: {
    onClonePendingChange?: (isPending: boolean) => void;
    onSuccess?: () => void;
  }) => (
    <>
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
};

type Form = ReturnType<typeof useCopySuiteForm>;

const createRhfForm = (values: CopySuiteFormValues): Form['form'] => {
  const { result } = renderHook(() =>
    useForm<CopySuiteFormValues>({
      mode: 'onChange',
      resolver: zodResolver(copySuiteSchema),
      defaultValues: values,
    }),
  );
  return result.current;
};

const defaultFormValues: CopySuiteFormValues = {
  suiteName: 'Curated suite copy',
  suiteDescription: 'Description',
  suiteDomains: ['reasoning', 'safety'],
  suiteTasks: ['text-generation'],
  suiteModalities: ['text'],
  suiteIndustries: ['technology'],
  suiteEvaluates: ['agent'],
  suiteThreshold: 70,
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
    suiteThreshold: overrides.suiteThreshold ?? defaultFormValues.suiteThreshold,
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
    suiteThreshold: formValues.suiteThreshold,
    handleSuiteThresholdChange: jest.fn(),
    benchmarks: formValues.benchmarks,
    selectedBenchmarkKeys: ['provider-one:benchmark-one'],
    totalWeight: 1,
    weightSegments: [{ label: 'Benchmark One', weight: 1, percentage: 100 }],
    updateBenchmark: jest.fn(),
    applyBenchmarkSelection: jest.fn(),
    handleWeightsChange: jest.fn(),
    isSettingsValid: formValues.suiteName.trim() !== '',
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

const renderPage = () =>
  render(
    <MemoryRouter
      initialEntries={['/evaluation/test-namespace/create/collections/source-collection/copy']}
    >
      <LocationDisplay />
      <Routes>
        <Route
          path="/evaluation/:namespace/create/collections/:collectionId/copy"
          element={<CopySuitePage />}
        />
      </Routes>
    </MemoryRouter>,
  );

const renderCreatePage = () =>
  render(
    <MemoryRouter initialEntries={['/evaluation/test-namespace/create/collections/new']}>
      <LocationDisplay />
      <Routes>
        <Route path="/evaluation/:namespace/create/collections/new" element={<CreateSuitePage />} />
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

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCollection.mockReturnValue(jest.fn());
  mockUseProviders.mockReturnValue({ providers, loaded: true, loadError: undefined });
  mockUseCopySuiteForm.mockReturnValue(makeForm());
});

describe('CopySuitePage', () => {
  it('should render the reusable blank create suite flow with a create CTA', () => {
    mockUseFetchState.mockReturnValue([undefined, true, undefined, jest.fn()]);

    renderCreatePage();

    expect(screen.getByTestId('app-page-title')).toHaveTextContent('Create suite');
    expect(screen.getByTestId('suite-name-input')).toHaveAttribute(
      'placeholder',
      'Enter suite name',
    );
    expect(screen.getByTestId('suite-description-input')).toHaveAttribute(
      'placeholder',
      'Enter suite description',
    );
    expect(screen.getByTestId('suite-evaluates-toggle')).toHaveTextContent('1 evaluation target');
    expect(screen.getByTestId('copy-suite-description')).toHaveTextContent(
      'Create a benchmark suite',
    );
    goToBenchmarksStep();
    expect(screen.getByTestId('create-suite-submit')).toHaveTextContent('Save and run');
    expect(screen.getByTestId('copy-suite-save-only')).toHaveTextContent(
      'Add to my benchmark suites',
    );
    fireEvent.click(screen.getByTestId('copy-suite-back-step-2'));
    expect(screen.getByTestId('copy-suite-step-select-benchmarks')).toBeInTheDocument();
  });

  it('should wire create and run and create only to their respective handlers', () => {
    const form = makeForm();
    mockUseCopySuiteForm.mockReturnValue(form);
    mockUseFetchState.mockReturnValue([undefined, true, undefined, jest.fn()]);

    renderCreatePage();
    goToBenchmarksStep();

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
    goToBenchmarksStep();
    fireEvent.click(screen.getByTestId('create-suite-submit'));
    fireEvent.click(screen.getByTestId('copy-suite-run-success'));

    expect(screen.getByTestId('location-display')).toHaveTextContent(
      '/evaluation/test-namespace?tab=runs',
    );
  });

  it('should show a loading state while the collection is loading', () => {
    mockUseFetchState.mockReturnValue([undefined, false, undefined, jest.fn()]);

    renderPage();

    expect(screen.getByLabelText('Loading benchmark suite')).toBeInTheDocument();
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
    expect(screen.queryByLabelText('Loading benchmark suite')).not.toBeInTheDocument();
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

    expect(screen.getByTestId('app-page-title')).toHaveTextContent('Copy suite');
    expect(screen.getByTestId('copy-suite-description')).toBeInTheDocument();
    expect(screen.getByTestId('suite-name-input')).toHaveValue('Curated suite copy');
    expect(screen.getByTestId('suite-description-input')).toHaveValue('Description');
    expect(screen.queryByTestId('suite-category-toggle')).not.toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByTestId('suite-domains-toggle')).toHaveTextContent('2 categories selected');
    expect(screen.getByTestId('suite-evaluates-toggle')).toHaveTextContent('1 evaluation target');
    expect(screen.getByTestId('suite-evaluates-tag-agent')).toHaveTextContent('Agent');
    expect(screen.getByTestId('suite-domains-tag-reasoning')).toHaveTextContent('Reasoning');
    expect(screen.getByTestId('suite-tasks-tag-text-generation')).toHaveTextContent(
      'Text generation',
    );
    expect(screen.getByTestId('suite-modalities-tag-text')).toHaveTextContent('Text');
    expect(screen.getByTestId('suite-industries-tag-technology')).toHaveTextContent('Technology');
    expect(screen.queryByText('Language benchmark suites')).not.toBeInTheDocument();
    expect(screen.getByText('Customize benchmark suite')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Model benchmark suites' })).not.toBeInTheDocument();
    expect(screen.getByTestId('copy-suite-next')).toBeInTheDocument();
    expect(screen.getByTestId('copy-suite-settings-actions')).toHaveClass(
      'evalhub-copy-suite-page__footer',
    );
    expect(screen.queryByTestId('copy-suite-save-and-run')).not.toBeInTheDocument();
  });

  it('should link to the originating curated suite page when ai entity metadata is available', () => {
    mockUseFetchState.mockReturnValue([
      {
        ...sourceCollection,
        // eslint-disable-next-line camelcase
        ai_entities: ['model'],
      },
      true,
      undefined,
      jest.fn(),
    ]);

    renderPage();

    expect(screen.getByRole('link', { name: 'Model benchmark suites' })).toHaveAttribute(
      'href',
      '/evaluation/test-namespace/collections/model',
    );
  });

  it('uses singular wording for a single selected category', () => {
    mockUseCopySuiteForm.mockReturnValue(makeForm({ suiteDomains: ['reasoning'] }));
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);

    renderPage();

    expect(screen.getByTestId('suite-domains-toggle')).toHaveTextContent('1 category selected');
  });

  it('uses singular and plural evaluation target wording', () => {
    mockUseCopySuiteForm.mockReturnValue(makeForm({ suiteEvaluates: ['agent', 'model'] }));
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);

    renderPage();

    expect(screen.getByTestId('suite-evaluates-toggle')).toHaveTextContent('2 evaluation targets');
  });

  it('should associate metadata labels with their multi-select controls', () => {
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);

    renderPage();

    expect(screen.getByLabelText('Evaluates')).toHaveAttribute(
      'data-testid',
      'suite-evaluates-toggle',
    );
    expect(screen.getByLabelText('Category')).toHaveAttribute(
      'data-testid',
      'suite-domains-toggle',
    );
    expect(screen.getByLabelText('Tasks')).toHaveAttribute('data-testid', 'suite-tasks-toggle');
    expect(screen.getByLabelText('Modalities')).toHaveAttribute(
      'data-testid',
      'suite-modalities-toggle',
    );
    expect(screen.getByLabelText('Industries')).toHaveAttribute(
      'data-testid',
      'suite-industries-toggle',
    );
  });

  it('should filter metadata options from the search input', () => {
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);

    renderPage();
    fireEvent.click(screen.getByTestId('suite-tasks-toggle'));
    fireEvent.change(screen.getByPlaceholderText('Search tasks'), {
      target: { value: 'chart' },
    });

    expect(screen.getByTestId('suite-tasks-option-document_chart_vqa')).toBeInTheDocument();
    expect(screen.queryByTestId('suite-tasks-option-code_generation')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('suite-tasks-toggle'));
  });

  it('should add and remove metadata values when selecting options', () => {
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);
    const form = makeForm({ suiteDomains: ['reasoning'] });
    mockUseCopySuiteForm.mockReturnValue(form);

    renderPage();
    fireEvent.click(screen.getByTestId('suite-domains-toggle'));
    fireEvent.click(
      within(screen.getByTestId('suite-domains-option-safety')).getByRole('checkbox'),
    );

    expect(form.form.getValues('suiteDomains')).toEqual(['reasoning', 'safety']);

    fireEvent.click(
      within(screen.getByTestId('suite-domains-option-safety')).getByRole('checkbox'),
    );

    expect(form.form.getValues('suiteDomains')).toEqual(['reasoning']);
  });

  it('should allow the final selected metadata value to be removed', () => {
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);
    const form = makeForm({ suiteDomains: ['reasoning'] });
    mockUseCopySuiteForm.mockReturnValue(form);

    renderPage();
    fireEvent.click(within(screen.getByTestId('suite-domains-tag-reasoning')).getByRole('button'));

    expect(screen.queryByTestId('suite-domains-tag-reasoning')).not.toBeInTheDocument();
    expect(screen.getByTestId('suite-domains-toggle')).toHaveTextContent('Select category');
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
    fireEvent.click(screen.getByTestId('suite-evaluates-toggle'));
    fireEvent.click(
      within(screen.getByTestId('suite-evaluates-option-model')).getByRole('checkbox'),
    );
    fireEvent.click(screen.getByTestId('suite-evaluates-toggle'));
    fireEvent.click(screen.getByTestId('suite-domains-toggle'));
    fireEvent.click(
      within(screen.getByTestId('suite-domains-option-knowledge_and_reasoning')).getByRole(
        'checkbox',
      ),
    );
    fireEvent.click(screen.getByTestId('suite-domains-toggle'));
    fireEvent.click(within(screen.getByTestId('suite-domains-tag-safety')).getByRole('button'));

    fireEvent.click(screen.getByTestId('suite-tasks-toggle'));
    fireEvent.click(
      within(screen.getByTestId('suite-tasks-option-reasoning')).getByRole('checkbox'),
    );
    fireEvent.click(screen.getByTestId('suite-tasks-toggle'));

    fireEvent.click(screen.getByTestId('suite-modalities-toggle'));
    fireEvent.click(
      within(screen.getByTestId('suite-modalities-option-vision')).getByRole('checkbox'),
    );
    fireEvent.click(screen.getByTestId('suite-modalities-toggle'));

    fireEvent.click(screen.getByTestId('suite-industries-toggle'));
    fireEvent.click(
      within(screen.getByTestId('suite-industries-option-health')).getByRole('checkbox'),
    );
    fireEvent.click(screen.getByTestId('suite-industries-toggle'));
    fireEvent.click(screen.getByTestId('copy-suite-cancel'));
    expect(form.handleCancel).toHaveBeenCalledTimes(1);

    goToBenchmarksStep();

    expect(screen.getByText('Benchmarks')).toBeInTheDocument();
    expect(screen.getByTestId('copy-suite-benchmark-sections')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('copy-suite-save-and-run'));
    fireEvent.click(screen.getByTestId('copy-suite-save-only'));
    fireEvent.click(screen.getByTestId('copy-suite-cancel-step-2'));

    expect(form.form.getValues('suiteName')).toBe('Updated suite');
    expect(form.form.getValues('suiteDescription')).toBe('Updated description');
    expect(form.form.getValues('suiteEvaluates')).toEqual(['agent', 'model']);
    expect(form.form.getValues('suiteDomains')).toEqual(['reasoning', 'knowledge_and_reasoning']);
    expect(form.form.getValues('suiteTasks')).toEqual(['text-generation', 'reasoning']);
    expect(form.form.getValues('suiteModalities')).toEqual(['text', 'vision']);
    expect(form.form.getValues('suiteIndustries')).toEqual(['technology', 'health']);
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

  it('should disable save actions when the form is invalid or submitting', () => {
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);
    mockUseCopySuiteForm.mockReturnValue(makeForm({ isValid: false }));

    renderPage();
    goToBenchmarksStep();

    expect(screen.getByTestId('copy-suite-save-and-run')).toBeDisabled();
    expect(screen.getByTestId('copy-suite-save-only')).toBeDisabled();
  });

  it('should navigate through the select benchmarks step before configuration', () => {
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);

    renderPage();
    goToSelectBenchmarksStep();

    expect(screen.getByTestId('copy-suite-step-select-benchmarks')).toBeInTheDocument();
    expect(screen.getByText('Select benchmarks')).toBeInTheDocument();
    expect(screen.getByTestId('copy-suite-breadcrumb-settings')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('copy-suite-next-select-benchmarks'));
    expect(screen.getByTestId('copy-suite-step-benchmarks')).toBeInTheDocument();
    expect(screen.queryByTestId('copy-suite-add-benchmarks-btn')).not.toBeInTheDocument();
  });

  it('should render separators between every breadcrumb step', () => {
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);

    renderPage();
    goToSelectBenchmarksStep();

    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(breadcrumb.querySelectorAll('.pf-v6-c-breadcrumb__item-divider')).toHaveLength(2);

    fireEvent.click(screen.getByTestId('copy-suite-next-select-benchmarks'));
    expect(breadcrumb.querySelectorAll('.pf-v6-c-breadcrumb__item-divider')).toHaveLength(3);
  });

  it('should navigate back to settings from the select benchmarks breadcrumb', () => {
    mockUseFetchState.mockReturnValue([undefined, true, undefined, jest.fn()]);

    renderCreatePage();
    goToSelectBenchmarksStep();

    fireEvent.click(screen.getByTestId('copy-suite-breadcrumb-settings'));
    expect(screen.getByTestId('copy-suite-form')).toBeInTheDocument();
  });

  it('should navigate back to settings from the benchmarks breadcrumb', () => {
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);

    renderPage();
    goToBenchmarksStep();
    expect(screen.queryByTestId('copy-suite-form')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('copy-suite-breadcrumb-settings'));
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
    goToBenchmarksStep();
    fireEvent.click(screen.getByTestId('copy-suite-save-and-run'));
    fireEvent.click(screen.getByTestId('copy-suite-set-clone-pending'));

    expect(screen.getByTestId('benchmark-0-parameter-input-num_examples')).toBeDisabled();
    expect(screen.getByTestId('copy-suite-back-step-2')).toBeDisabled();
    expect(screen.getByTestId('copy-suite-save-and-run')).toBeDisabled();
    expect(screen.getByTestId('copy-suite-save-only')).toBeDisabled();
    expect(screen.getByTestId('copy-suite-cancel-step-2')).toBeDisabled();
    expect(screen.getByTestId('copy-suite-breadcrumb-settings')).toBeDisabled();
    expect(within(screen.getByTestId('benchmark-jump-link-0')).queryByRole('link')).toBeNull();
    expect(screen.getByTestId('copy-suite-breadcrumb-evaluations')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByTestId('copy-suite-breadcrumb-evaluations')).not.toHaveAttribute('href');
    fireEvent.click(screen.getByTestId('copy-suite-breadcrumb-settings'));
    expect(screen.getByTestId('copy-suite-step-benchmarks')).toBeInTheDocument();
    expect(screen.queryByTestId('copy-suite-form')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('copy-suite-breadcrumb-evaluations'));
    expect(screen.getByTestId('copy-suite-step-benchmarks')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('copy-suite-set-clone-complete'));
    expect(screen.getByTestId('benchmark-0-parameter-input-num_examples')).toBeEnabled();
    expect(screen.getByTestId('copy-suite-breadcrumb-settings')).toBeEnabled();
    expect(screen.getByTestId('copy-suite-breadcrumb-evaluations')).toHaveAttribute('href');
    expect(within(screen.getByTestId('benchmark-jump-link-0')).getByRole('link')).toHaveAttribute(
      'href',
      '#benchmark-section-0',
    );
  });

  it('should disable the select benchmarks step while a save-only operation is pending', () => {
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);
    mockUseCopySuiteForm.mockReturnValue(makeForm({ isSubmitting: true }));

    renderPage();

    goToSelectBenchmarksStep();

    expect(screen.getByTestId('copy-suite-next-select-benchmarks')).toBeDisabled();
    expect(screen.getByTestId('copy-suite-back-select-benchmarks')).toBeDisabled();
    expect(screen.getByTestId('copy-suite-cancel-select-benchmarks')).toBeDisabled();
    expect(screen.getByTestId('copy-suite-breadcrumb-settings')).toBeDisabled();
    expect(screen.getByTestId('copy-suite-breadcrumb-evaluations')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByTestId('copy-suite-breadcrumb-evaluations')).not.toHaveAttribute('href');

    fireEvent.click(screen.getByTestId('copy-suite-breadcrumb-settings'));
    expect(screen.getByTestId('copy-suite-step-select-benchmarks')).toBeInTheDocument();
  });

  it('should close benchmark details and weight overlays when a clone becomes pending', () => {
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

    fireEvent.click(screen.getByTestId('copy-suite-save-and-run'));
    fireEvent.click(screen.getByTestId('copy-suite-set-clone-pending'));
    expect(screen.queryByTestId('copy-suite-benchmark-details-overlay')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('copy-suite-set-clone-complete'));
    expect(screen.queryByTestId('copy-suite-benchmark-details-overlay')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('benchmark-weight-edit-0'));
    expect(screen.getByTestId('copy-suite-benchmark-weights-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('copy-suite-set-clone-pending'));
    expect(screen.queryByTestId('copy-suite-benchmark-weights-modal')).not.toBeInTheDocument();
  });
});
