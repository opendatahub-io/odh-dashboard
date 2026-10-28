/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import StartEvaluationRunPage from '~/app/pages/StartEvaluationRunPage';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';
import type { Collection, FlatBenchmark } from '~/app/types';
import type { ReconfigureFormData } from '~/app/utils/extractReconfigureData';
import { testDataRefDefaultValues } from '~/app/schemas/testDataRef.schema';

type SelectionResult = {
  benchmark: FlatBenchmark | undefined;
  collection: Collection | undefined;
  isCollectionFlow: boolean;
  dataLoaded: boolean;
  loadError: Error | undefined;
};

const mockUseEvaluationSelection = jest.fn<SelectionResult, [string | undefined, boolean?]>();

jest.mock('~/app/hooks/useEvaluationSelection', () => ({
  useEvaluationSelection: (...args: [string | undefined, boolean?]) =>
    mockUseEvaluationSelection(...args),
}));

jest.mock('~/app/hooks/useNamespaceSelectorWithPersistence', () => ({
  useNamespaceSelectorWithPersistence: () => ({
    namespaces: [{ name: 'test-ns', displayName: 'Test Project' }],
    namespacesLoaded: true,
  }),
}));

jest.mock('@odh-dashboard/internal/concepts/mlflow', () => {
  const actualReact = jest.requireActual<typeof import('react')>('react');
  const MlflowExperimentSelector = () =>
    actualReact.createElement(
      'button',
      { type: 'button', 'data-testid': 'mlflow-experiment-selector-probe' },
      'MLflow experiment selector',
    );
  return {
    MlflowExperimentSelector,
    useMlflowExperiments: () => ({ data: [{ name: 'EvalHub' }], loaded: true }),
  };
});

jest.mock('~/app/hooks/useInferenceServices', () => ({
  useInferenceServices: () => ({
    inferenceServices: [],
    loaded: true,
    loadError: undefined,
    warning: undefined,
  }),
}));

jest.mock('~/app/hooks/useConnectionValidation', () => ({
  useConnectionValidation: () => ({
    connectionValidation: { status: 'idle' },
    setConnectionValidation: jest.fn(),
    handleVerifyConnection: jest.fn(),
  }),
}));

jest.mock('~/app/hooks/useHardwareProfiles', () => ({
  useHardwareProfiles: () => ({ profiles: [], loaded: true, error: undefined }),
}));

jest.mock('~/app/hooks/useKueueAvailability', () => ({
  useKueueAvailability: () => ({ availability: undefined, loaded: true, error: undefined }),
}));

jest.mock('~/app/hooks/useNotification', () => ({
  useNotification: () => ({
    success: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock('~/app/api/k8s', () => ({
  createEvaluationJob: jest.fn(() => () => Promise.resolve({})),
}));

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
  fireMiscTrackingEvent: jest.fn(),
}));

jest.mock('@odh-dashboard/ui-core', () => ({
  ...jest.requireActual('@odh-dashboard/ui-core'),
  ...require('~/__tests__/unit/testUtils/mocks').mockApplicationsPageModule(),
}));

const mockFireMiscTrackingEvent = jest.mocked(fireMiscTrackingEvent);

const benchmark: FlatBenchmark = {
  id: 'benchmark-a',
  name: 'Benchmark A',
  providerId: 'provider-a',
  providerName: 'Provider A',
};

const collection: Collection = {
  resource: { id: 'collection-a' },
  name: 'My collection',
  benchmarks: [{ id: 'benchmark-a', provider_id: 'provider-b' }],
};

const reconfigureValues: ReconfigureFormData = {
  evaluationName: 'Reconfigured eval',
  sourceMode: 'model',
  modelSelection: 'cluster',
  modelName: '',
  selectedInferenceService: undefined,
  endpointUrl: '',
  apiKeySecretRef: '',
  sourceName: '',
  datasetUrl: '',
  accessToken: '',
  testDataRef: { ...testDataRefDefaultValues },
  benchmark,
  collection: undefined,
  isCollectionFlow: false,
  threshold: 0.5,
  primaryMetric: undefined,
  additionalArgs: '',
  experimentName: undefined,
  hardwareProfile: undefined,
  queue: undefined,
};

type PageProps = React.ComponentProps<typeof StartEvaluationRunPage>;

const renderPage = (props: PageProps = {}) => render(getPageTree(props));

const getPageTree = (props: PageProps = {}) => (
  <MemoryRouter initialEntries={['/evaluation/test-ns/create/start?type=benchmark']}>
    <Routes>
      <Route
        path="/evaluation/:namespace/create/start"
        element={<StartEvaluationRunPage {...props} />}
      />
    </Routes>
  </MemoryRouter>
);

describe('StartEvaluationRunPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEvaluationSelection.mockReturnValue({
      benchmark,
      collection: undefined,
      isCollectionFlow: false,
      dataLoaded: true,
      loadError: undefined,
    });
  });

  it('should track job create opened when the full-page create form loads', () => {
    renderPage();

    expect(mockFireMiscTrackingEvent).toHaveBeenCalledTimes(1);
    expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith(
      EVAL_HUB_EVENTS.JOB_CREATE_OPENED,
      expect.objectContaining({
        surface: 'create_run_page',
        collection_type: 'unknown',
        provider_type: 'provider-a',
      }),
    );
  });

  it('should track job create opened with collection context in the collection flow', () => {
    mockUseEvaluationSelection.mockReturnValue({
      benchmark: undefined,
      collection,
      isCollectionFlow: true,
      dataLoaded: true,
      loadError: undefined,
    });

    renderPage();

    expect(mockFireMiscTrackingEvent).toHaveBeenCalledTimes(1);
    expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith(
      EVAL_HUB_EVENTS.JOB_CREATE_OPENED,
      expect.objectContaining({
        surface: 'create_run_page',
        collection_type: 'custom',
        provider_type: 'provider-b',
      }),
    );
  });

  it('should track job create opened only once per page opening', () => {
    const { rerender } = renderPage();
    expect(mockFireMiscTrackingEvent).toHaveBeenCalledTimes(1);

    // A new selection object identity on a later render must not re-emit.
    mockUseEvaluationSelection.mockReturnValue({
      benchmark: { ...benchmark },
      collection: undefined,
      isCollectionFlow: false,
      dataLoaded: true,
      loadError: undefined,
    });
    rerender(getPageTree());

    expect(mockFireMiscTrackingEvent).toHaveBeenCalledTimes(1);
  });

  it('should not track job create opened while the selection is loading', () => {
    mockUseEvaluationSelection.mockReturnValue({
      benchmark: undefined,
      collection: undefined,
      isCollectionFlow: false,
      dataLoaded: false,
      loadError: undefined,
    });

    renderPage();

    expect(screen.getByLabelText('Loading evaluation data')).toBeInTheDocument();
    expect(mockFireMiscTrackingEvent).not.toHaveBeenCalled();
  });

  it('should not track job create opened when the selection fails to load', () => {
    mockUseEvaluationSelection.mockReturnValue({
      benchmark: undefined,
      collection: undefined,
      isCollectionFlow: false,
      dataLoaded: true,
      loadError: new Error('Selection load failed'),
    });

    renderPage();

    expect(screen.getByTestId('start-evaluation-load-error')).toBeInTheDocument();
    expect(mockFireMiscTrackingEvent).not.toHaveBeenCalled();
  });

  it('should not track job create opened for the reconfigure flow', () => {
    renderPage({ initialValues: reconfigureValues, sourceJobId: 'job-123' });

    expect(screen.getByTestId('start-evaluation-form')).toBeInTheDocument();
    expect(mockFireMiscTrackingEvent).not.toHaveBeenCalled();
  });
});
