import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useFetchState } from 'mod-arch-core';
import { getCollection } from '~/app/api/k8s';
import { useProviders } from '~/app/hooks/useProviders';
import { useCopySuiteForm, MAX_BENCHMARKS } from '~/app/pages/useCopySuiteForm';
import CopySuitePage from '~/app/pages/CopySuitePage';
import type { Collection, Provider } from '~/app/types';

jest.mock('mod-arch-core', () => ({
  ...jest.requireActual('mod-arch-core'),
  useFetchState: jest.fn(),
}));

jest.mock('~/app/api/k8s', () => ({
  getCollection: jest.fn(),
}));

jest.mock('~/app/hooks/useProviders', () => ({
  useProviders: jest.fn(),
}));

jest.mock('~/app/pages/useCopySuiteForm', () => ({
  MAX_BENCHMARKS: 10,
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

jest.mock('~/app/components/WeightDistributionBar', () => ({
  __esModule: true,
  default: ({ segments }: { segments: { label: string }[] }) => (
    <div data-testid="weight-distribution">
      {segments.map((segment) => segment.label).join(',')}
    </div>
  ),
}));

jest.mock('~/app/components/BenchmarkConfigAccordion', () => ({
  __esModule: true,
  default: ({ benchmarks }: { benchmarks: { name: string }[] }) => (
    <div data-testid="benchmark-config-accordion">
      {benchmarks.map((benchmark) => benchmark.name).join(',')}
    </div>
  ),
}));

jest.mock('~/app/components/AddBenchmarkModal', () => ({
  __esModule: true,
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="add-benchmark-modal">
      <button type="button" onClick={onClose}>
        Close modal
      </button>
    </div>
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

const makeForm = (overrides: Partial<Form> = {}): Form => ({
  suiteName: 'Curated suite copy',
  setSuiteName: jest.fn(),
  suiteDescription: 'Description',
  setSuiteDescription: jest.fn(),
  suiteCategory: 'language',
  setSuiteCategory: jest.fn(),
  suiteThreshold: 70,
  handleSuiteThresholdChange: jest.fn(),
  benchmarks: [benchmark],
  setBenchmarks: jest.fn(),
  totalWeight: 1,
  weightSegments: [{ label: 'Benchmark One', weight: 1, percentage: 100 }],
  updateBenchmark: jest.fn(),
  removeBenchmark: jest.fn(),
  addBenchmarks: jest.fn(),
  handleWeightsChange: jest.fn(),
  isValid: true,
  isSubmitting: false,
  handleSaveAndRun: jest.fn(),
  handleSaveOnly: jest.fn(),
  handleCancel: jest.fn(),
  minWeightPercent: 5,
  ...overrides,
});

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

    expect(screen.getByLabelText('Loading collection data')).toBeInTheDocument();
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

  it('should render the copied suite form and breadcrumb when loaded', () => {
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);

    renderPage();

    expect(screen.getByTestId('app-page-title')).toHaveTextContent('Copy suite');
    expect(screen.getByTestId('copy-suite-description')).toBeInTheDocument();
    expect(screen.getByTestId('suite-name-input')).toHaveValue('Curated suite copy');
    expect(screen.getByTestId('suite-description-input')).toHaveValue('Description');
    expect(screen.getByTestId('suite-category-toggle')).toHaveTextContent('Language');
    expect(screen.getByText('Language benchmark suites')).toBeInTheDocument();
    expect(screen.getByTestId('app-page-title')).toHaveTextContent('Copy suite');
    expect(screen.getByTestId('benchmark-config-accordion')).toHaveTextContent('Benchmark One');
    expect(screen.getByTestId('copy-suite-save-and-run')).toBeInTheDocument();
    expect(screen.getByTestId('copy-suite-save-only')).toBeInTheDocument();
    expect(screen.getByTestId('copy-suite-cancel')).toBeInTheDocument();
  });

  it('should pass metadata and action events to the form hook', () => {
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
    fireEvent.click(screen.getByTestId('copy-suite-save-and-run'));
    fireEvent.click(screen.getByTestId('copy-suite-save-only'));
    fireEvent.click(screen.getByTestId('copy-suite-cancel'));

    expect(form.setSuiteName).toHaveBeenCalledWith('Updated suite');
    expect(form.setSuiteDescription).toHaveBeenCalledWith('Updated description');
    expect(form.handleSaveAndRun).toHaveBeenCalledTimes(1);
    expect(form.handleSaveOnly).toHaveBeenCalledTimes(1);
    expect(form.handleCancel).toHaveBeenCalledTimes(1);
  });

  it('should disable save actions when the form is invalid or submitting', () => {
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);
    mockUseCopySuiteForm.mockReturnValue(makeForm({ isValid: false, isSubmitting: true }));

    renderPage();

    expect(screen.getByTestId('copy-suite-save-and-run')).toBeDisabled();
    expect(screen.getByTestId('copy-suite-save-only')).toBeDisabled();
  });

  it('should open and close the add benchmark modal', () => {
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);

    renderPage();
    fireEvent.click(screen.getByTestId('add-benchmarks-button'));

    expect(screen.getByTestId('add-benchmark-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close modal' }));
    expect(screen.queryByTestId('add-benchmark-modal')).not.toBeInTheDocument();
  });

  it('should keep the add action disabled at the benchmark limit', () => {
    mockUseFetchState.mockReturnValue([sourceCollection, true, undefined, jest.fn()]);
    mockUseCopySuiteForm.mockReturnValue(
      makeForm({
        benchmarks: Array.from({ length: MAX_BENCHMARKS }, (_, index) => ({
          ...benchmark,
          id: `benchmark-${index}`,
        })),
      }),
    );

    renderPage();

    expect(screen.getByTestId('add-benchmarks-button')).toHaveAttribute('aria-disabled', 'true');
  });
});
