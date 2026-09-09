import * as React from 'react';
import { fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useFetchState } from 'mod-arch-core';
import { getCollection } from '~/app/api/k8s';
import { useProviders } from '~/app/hooks/useProviders';
import { useCopySuiteForm } from '~/app/pages/useCopySuiteForm';
import CopySuitePage from '~/app/pages/CopySuitePage';
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

jest.mock('~/app/components/CopySuiteBenchmarkCatalogDrawer', () => ({
  __esModule: true,
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="copy-suite-benchmark-catalog-drawer">
      <button type="button" onClick={onClose}>
        Close catalog drawer
      </button>
    </div>
  ),
}));

jest.mock('~/app/components/CopySuiteBenchmarkDetailsOverlay', () => ({
  __esModule: true,
  default: () => <div data-testid="copy-suite-benchmark-details-overlay" />,
}));

jest.mock('~/app/components/BenchmarkWeightsModal', () => ({
  __esModule: true,
  default: () => <div data-testid="copy-suite-benchmark-weights-modal" />,
}));

jest.mock('~/app/components/StartEvaluationRunModal', () => ({
  __esModule: true,
  default: ({ onClonePendingChange }: { onClonePendingChange?: (isPending: boolean) => void }) => (
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

const benchmark = {
  id: 'benchmark-one',
  providerId: 'provider-one',
  name: 'Benchmark One',
  weight: 1,
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
  suiteCategory: 'language',
  suiteEvaluates: 'agent',
  suiteThreshold: 70,
  benchmarks: [benchmark],
};

const makeForm = (overrides: Partial<Form> = {}): Form => {
  const formValues: CopySuiteFormValues = {
    ...defaultFormValues,
    suiteName: overrides.suiteName ?? defaultFormValues.suiteName,
    suiteDescription: overrides.suiteDescription ?? defaultFormValues.suiteDescription,
    suiteCategory: overrides.suiteCategory ?? defaultFormValues.suiteCategory,
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
    suiteCategory: formValues.suiteCategory,
    setSuiteCategory: jest.fn(),
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
    minWeightPercent: 5,
    ...overrides,
  };
};

const renderPage = () =>
  render(
    <MemoryRouter
      initialEntries={['/evaluation/test-namespace/create/collections/source-collection/copy']}
    >
      <Routes>
        <Route
          path="/evaluation/:namespace/create/collections/:collectionId/copy"
          element={<CopySuitePage />}
        />
      </Routes>
    </MemoryRouter>,
  );

const goToBenchmarksStep = () => {
  fireEvent.click(screen.getByTestId('copy-suite-next'));
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCollection.mockReturnValue(jest.fn());
  mockUseProviders.mockReturnValue({ providers, loaded: true, loadError: undefined });
  mockUseCopySuiteForm.mockReturnValue(makeForm());
});

describe('CopySuitePage', () => {
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
    expect(screen.getByText('Return to benchmark suites')).toBeInTheDocument();
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
    expect(screen.getByTestId('suite-category-toggle')).toHaveTextContent('Language');
    expect(screen.getByText('Language benchmark suites')).toBeInTheDocument();
    expect(screen.getByText('Customize benchmark suite')).toBeInTheDocument();
    expect(screen.getByTestId('copy-suite-next')).toBeInTheDocument();
    expect(screen.queryByTestId('copy-suite-save-and-run')).not.toBeInTheDocument();
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
    mockUseCopySuiteForm.mockReturnValue(makeForm({ isValid: false, isSubmitting: true }));

    renderPage();
    goToBenchmarksStep();

    expect(screen.getByTestId('copy-suite-save-and-run')).toBeDisabled();
    expect(screen.getByTestId('copy-suite-save-only')).toBeDisabled();
  });

  it('should open and close the benchmark catalog drawer from the benchmarks step', () => {
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);

    renderPage();
    goToBenchmarksStep();
    fireEvent.click(screen.getByTestId('copy-suite-add-benchmarks-btn'));

    expect(screen.getByTestId('copy-suite-benchmark-catalog-drawer')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close catalog drawer' }));
    expect(screen.queryByTestId('copy-suite-benchmark-catalog-drawer')).not.toBeInTheDocument();
  });

  it('should navigate back to settings from the benchmarks breadcrumb', () => {
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);

    renderPage();
    goToBenchmarksStep();
    expect(screen.queryByTestId('copy-suite-form')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('copy-suite-breadcrumb-settings'));
    expect(screen.getByTestId('copy-suite-form')).toBeInTheDocument();
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
    fireEvent.click(screen.getByTestId('copy-suite-add-benchmarks-btn'));
    expect(screen.getByTestId('copy-suite-benchmark-catalog-drawer')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('copy-suite-save-and-run'));
    fireEvent.click(screen.getByTestId('copy-suite-set-clone-pending'));

    expect(screen.queryByTestId('copy-suite-benchmark-catalog-drawer')).not.toBeInTheDocument();
    expect(screen.getByTestId('benchmark-samples-input-0')).toBeDisabled();
    expect(screen.getByTestId('copy-suite-add-benchmarks-btn')).toBeDisabled();
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
    expect(screen.getByTestId('copy-suite-breadcrumb-collections')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByTestId('copy-suite-breadcrumb-collections')).not.toHaveAttribute('href');

    fireEvent.click(screen.getByTestId('copy-suite-breadcrumb-settings'));
    expect(screen.getByTestId('copy-suite-step-benchmarks')).toBeInTheDocument();
    expect(screen.queryByTestId('copy-suite-form')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('copy-suite-breadcrumb-evaluations'));
    expect(screen.getByTestId('copy-suite-step-benchmarks')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('copy-suite-set-clone-complete'));
    expect(screen.queryByTestId('copy-suite-benchmark-catalog-drawer')).not.toBeInTheDocument();
    expect(screen.getByTestId('benchmark-samples-input-0')).toBeEnabled();
    expect(screen.getByTestId('copy-suite-breadcrumb-settings')).toBeEnabled();
    expect(screen.getByTestId('copy-suite-breadcrumb-evaluations')).toHaveAttribute('href');
    expect(within(screen.getByTestId('benchmark-jump-link-0')).getByRole('link')).toHaveAttribute(
      'href',
      '#benchmark-section-0',
    );
  });

  it('should disable editing and breadcrumb navigation while a save-only clone is pending', () => {
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);
    mockUseCopySuiteForm.mockReturnValue(makeForm({ isSubmitting: true }));

    renderPage();
    goToBenchmarksStep();

    expect(screen.getByTestId('benchmark-samples-input-0')).toBeDisabled();
    expect(screen.getByTestId('copy-suite-add-benchmarks-btn')).toBeDisabled();
    expect(screen.getByTestId('copy-suite-breadcrumb-settings')).toBeDisabled();
    expect(screen.getByTestId('copy-suite-breadcrumb-evaluations')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByTestId('copy-suite-breadcrumb-evaluations')).not.toHaveAttribute('href');

    fireEvent.click(screen.getByTestId('copy-suite-breadcrumb-settings'));
    expect(screen.getByTestId('copy-suite-step-benchmarks')).toBeInTheDocument();
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
