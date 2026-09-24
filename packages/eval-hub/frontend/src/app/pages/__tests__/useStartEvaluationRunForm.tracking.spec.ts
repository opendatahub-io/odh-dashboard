/* eslint-disable camelcase */
import { act, waitFor } from '@testing-library/react';
import {
  fireFormTrackingEvent,
  fireMiscTrackingEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/ui-core';
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import { createEvaluationJob, getHardwareProfiles } from '~/app/api/k8s';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';
import type { ReconfigureFormData } from '~/app/utils/extractReconfigureData';
import type {
  FlatBenchmark,
  Collection,
  HardwareProfile,
  InferenceServiceItem,
  KueueAvailability,
} from '~/app/types';
import {
  useStartEvaluationRunForm,
  EXTERNAL_ENDPOINT_VALUE,
} from '~/app/pages/useStartEvaluationRunForm';

const mockNavigate = jest.fn();
let mockHardwareProfilesLoaded = true;
let mockKueueAvailabilityLoaded = true;
let mockHardwareProfiles: HardwareProfile[] = [];
let mockKueueAvailability: KueueAvailability | undefined;
let mockHardwareProfilesError: Error | undefined;
let mockHardwareProfileCompatibilityError: Error | undefined;
let mockKueueAvailabilityError: Error | undefined;
const mockNotificationError = jest.fn();

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
  fireMiscTrackingEvent: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(() => mockNavigate),
}));

jest.mock('~/app/api/k8s', () => ({
  createEvaluationJob: jest.fn(() => () => Promise.resolve({})),
  getHardwareProfiles: jest.fn(() => () => Promise.resolve([])),
}));

jest.mock('~/app/hooks/useNotification', () => ({
  useNotification: () => ({
    success: jest.fn(),
    error: mockNotificationError,
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
  useHardwareProfiles: () => ({
    profiles: mockHardwareProfiles,
    loaded: mockHardwareProfilesLoaded,
    error: mockHardwareProfilesError,
    compatibilityError: mockHardwareProfileCompatibilityError,
  }),
}));

jest.mock('~/app/hooks/useKueueAvailability', () => ({
  useKueueAvailability: () => ({
    availability: mockKueueAvailability,
    loaded: mockKueueAvailabilityLoaded,
    error: mockKueueAvailabilityError,
  }),
}));

const mockFireMisc = jest.mocked(fireMiscTrackingEvent);
const mockFireForm = jest.mocked(fireFormTrackingEvent);
const mockCreateEvaluationJob = jest.mocked(createEvaluationJob);
const mockGetHardwareProfiles = jest.mocked(getHardwareProfiles);

const mockBenchmark: FlatBenchmark = {
  id: 'arc_easy',
  name: 'ARC Easy',
  providerId: 'prov-1',
  providerName: 'Provider 1',
  metrics: ['accuracy', 'f1_score'],
  primary_score: { metric: 'accuracy', lower_is_better: false },
  pass_criteria: { threshold: 0.7 },
};

const mockCollection: Collection = {
  resource: { id: 'col-1' },
  name: 'My Collection',
  pass_criteria: { threshold: 0.8 },
  benchmarks: [{ id: 'mmlu', provider_id: 'lm_harness' }],
};

const mockInferenceServices: InferenceServiceItem[] = [
  { name: 'model-a', url: 'http://model-a.svc:8080', ready: true },
  { name: 'model-b', url: 'http://model-b.svc:8080', ready: true },
];

const mockCompatibleHardwareProfile: HardwareProfile = {
  name: 'gpu-small',
  display_name: 'GPU small',
  enabled: true,
  local_queue_name: 'gpu-default',
};

const mockKueueEnabled: KueueAvailability = {
  enabled: true,
  scheduling_ready: true,
  cluster_enabled: true,
  namespace_managed: true,
  local_queues_available: true,
  local_queue_names: ['gpu-default'],
};

const reconfigureValues: ReconfigureFormData = {
  evaluationName: 'Reconfigured evaluation',
  sourceMode: 'model',
  modelSelection: 'cluster',
  modelName: 'model-a',
  selectedInferenceService: mockInferenceServices[0],
  endpointUrl: mockInferenceServices[0].url ?? '',
  apiKeySecretRef: '',
  sourceName: '',
  datasetUrl: '',
  accessToken: '',
  benchmark: mockBenchmark,
  collection: undefined,
  isCollectionFlow: false,
  threshold: 70,
  primaryMetric: 'accuracy',
  additionalArgs: '',
  experimentName: 'EvalHub',
  hardwareProfile: mockCompatibleHardwareProfile.name,
  queue: mockCompatibleHardwareProfile.local_queue_name,
};

const defaultFormParams = {
  namespace: 'test-ns',
  benchmark: mockBenchmark,
  collection: undefined as Collection | undefined,
  isCollectionFlow: false,
  experiments: [],
  experimentsLoaded: true,
};

const renderForm = (overrides = {}) =>
  testHook(useStartEvaluationRunForm)({ ...defaultFormParams, ...overrides });

describe('useStartEvaluationRunForm - Tracking Events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetHardwareProfiles.mockReturnValue(() => Promise.resolve([mockCompatibleHardwareProfile]));
    mockHardwareProfilesLoaded = true;
    mockKueueAvailabilityLoaded = true;
    mockHardwareProfiles = [];
    mockKueueAvailability = undefined;
    mockHardwareProfilesError = undefined;
    mockHardwareProfileCompatibilityError = undefined;
    mockKueueAvailabilityError = undefined;
  });

  it('should remain invalid while hardware profile data is loading', () => {
    mockHardwareProfilesLoaded = false;
    const renderResult = renderForm();

    expect(renderResult.result.current.isValid).toBe(false);
  });

  it('requires a HardwareProfile in a Kueue-managed namespace', async () => {
    mockHardwareProfiles = [mockCompatibleHardwareProfile];
    mockKueueAvailability = mockKueueEnabled;
    const renderResult = renderForm();

    act(() => {
      renderResult.result.current.handleModelDropdownSelect('model-a', mockInferenceServices);
      renderResult.result.current.setExperimentMode('new');
      renderResult.result.current.setNewExperimentName('EvalHub');
    });

    await waitFor(() => expect(renderResult.result.current.requiresHardwareProfile).toBe(true));
    expect(renderResult.result.current.isValid).toBe(false);

    act(() => {
      renderResult.result.current.setHardwareProfile(mockCompatibleHardwareProfile.name);
    });

    await waitFor(() => expect(renderResult.result.current.isValid).toBe(true));
  });

  it('requires a HardwareProfile when a Kueue-managed namespace has no compatible profiles', async () => {
    mockKueueAvailability = mockKueueEnabled;
    const renderResult = renderForm();

    act(() => {
      renderResult.result.current.handleModelDropdownSelect('model-a', mockInferenceServices);
      renderResult.result.current.setExperimentMode('new');
      renderResult.result.current.setNewExperimentName('EvalHub');
    });

    await waitFor(() => expect(renderResult.result.current.requiresHardwareProfile).toBe(true));
    expect(renderResult.result.current.isValid).toBe(false);
  });

  it('blocks submission when Kueue or HardwareProfiles cannot be loaded', async () => {
    mockKueueAvailability = mockKueueEnabled;
    mockHardwareProfilesError = new Error('Unable to load HardwareProfiles');
    const renderResult = renderForm();

    act(() => {
      renderResult.result.current.handleModelDropdownSelect('model-a', mockInferenceServices);
      renderResult.result.current.setExperimentMode('new');
      renderResult.result.current.setNewExperimentName('EvalHub');
    });

    await waitFor(() => expect(renderResult.result.current.isValid).toBe(false));
  });

  describe('Evaluations Run Source Selected', () => {
    it('should fire source selected event when switching to model mode', () => {
      const renderResult = renderForm();

      act(() => {
        renderResult.result.current.handleSourceModeChange('model');
      });

      expect(mockFireMisc).toHaveBeenCalledWith(EVAL_HUB_EVENTS.RUN_SOURCE_SELECTED, {
        sourceType: 'model',
      });
    });

    it('should fire source selected event when switching to agent mode', () => {
      const renderResult = renderForm();

      act(() => {
        renderResult.result.current.handleSourceModeChange('agent');
      });

      expect(mockFireMisc).toHaveBeenCalledWith(EVAL_HUB_EVENTS.RUN_SOURCE_SELECTED, {
        sourceType: 'agent',
      });
    });

    it('should fire source selected event when switching to prerecorded mode', () => {
      const renderResult = renderForm();

      act(() => {
        renderResult.result.current.handleSourceModeChange('prerecorded');
      });

      expect(mockFireMisc).toHaveBeenCalledWith(EVAL_HUB_EVENTS.RUN_SOURCE_SELECTED, {
        sourceType: 'prerecorded',
      });
    });

    it('should fire exactly one event per source change', () => {
      const renderResult = renderForm();

      act(() => {
        renderResult.result.current.handleSourceModeChange('agent');
      });

      const sourceSelectedCalls = mockFireMisc.mock.calls.filter(
        ([event]) => event === EVAL_HUB_EVENTS.RUN_SOURCE_SELECTED,
      );
      expect(sourceSelectedCalls).toHaveLength(1);
    });
  });

  describe('Evaluations Run Model Selected', () => {
    it('should fire model selected event when selecting a cluster model', () => {
      const renderResult = renderForm();

      act(() => {
        renderResult.result.current.handleModelDropdownSelect('model-a', mockInferenceServices);
      });

      expect(mockFireMisc).toHaveBeenCalledWith(EVAL_HUB_EVENTS.RUN_MODEL_SELECTED, {
        selectedModel: 'model-a',
        isExternal: false,
      });
    });

    it('should fire model selected event when selecting external endpoint', () => {
      const renderResult = renderForm();

      act(() => {
        renderResult.result.current.handleModelDropdownSelect(
          EXTERNAL_ENDPOINT_VALUE,
          mockInferenceServices,
        );
      });

      expect(mockFireMisc).toHaveBeenCalledWith(EVAL_HUB_EVENTS.RUN_MODEL_SELECTED, {
        selectedModel: 'Other (External endpoint)',
        isExternal: true,
      });
    });

    it('should not fire model selected event when value is undefined', () => {
      const renderResult = renderForm();

      act(() => {
        renderResult.result.current.handleModelDropdownSelect(undefined, mockInferenceServices);
      });

      const modelSelectedCalls = mockFireMisc.mock.calls.filter(
        ([event]) => event === EVAL_HUB_EVENTS.RUN_MODEL_SELECTED,
      );
      expect(modelSelectedCalls).toHaveLength(0);
    });
  });

  describe('Evaluations Run Threshold Changed', () => {
    it('should fire threshold changed event with value and benchmark name', () => {
      const renderResult = renderForm();

      act(() => {
        renderResult.result.current.handleThresholdChange(85);
      });

      expect(mockFireMisc).toHaveBeenCalledWith(EVAL_HUB_EVENTS.RUN_THRESHOLD_CHANGED, {
        thresholdValue: 85,
        benchmarkName: 'ARC Easy',
      });
    });

    it('should fire threshold changed event with collection name when in collection flow', () => {
      const renderResult = renderForm({
        collection: mockCollection,
        isCollectionFlow: true,
      });

      act(() => {
        renderResult.result.current.handleThresholdChange(60);
      });

      expect(mockFireMisc).toHaveBeenCalledWith(EVAL_HUB_EVENTS.RUN_THRESHOLD_CHANGED, {
        thresholdValue: 60,
        benchmarkName: 'My Collection',
      });
    });

    it('should fire event on each threshold change', () => {
      const renderResult = renderForm();

      act(() => {
        renderResult.result.current.handleThresholdChange(50);
      });
      act(() => {
        renderResult.result.current.handleThresholdChange(75);
      });

      const thresholdCalls = mockFireMisc.mock.calls.filter(
        ([event]) => event === EVAL_HUB_EVENTS.RUN_THRESHOLD_CHANGED,
      );
      expect(thresholdCalls).toHaveLength(2);
      expect(thresholdCalls[0][1]).toEqual(expect.objectContaining({ thresholdValue: 50 }));
      expect(thresholdCalls[1][1]).toEqual(expect.objectContaining({ thresholdValue: 75 }));
    });
  });

  describe('Evaluations Run Metric Selected', () => {
    it('should fire metric selected event with isDefault true when selecting default metric', () => {
      const renderResult = renderForm();

      act(() => {
        renderResult.result.current.handlePrimaryMetricChange('accuracy');
      });

      expect(mockFireMisc).toHaveBeenCalledWith(EVAL_HUB_EVENTS.RUN_METRIC_SELECTED, {
        metricName: 'accuracy',
        isDefault: true,
        benchmarkName: 'ARC Easy',
      });
    });

    it('should fire metric selected event with isDefault false when selecting non-default metric', () => {
      const renderResult = renderForm();

      act(() => {
        renderResult.result.current.handlePrimaryMetricChange('f1_score');
      });

      expect(mockFireMisc).toHaveBeenCalledWith(EVAL_HUB_EVENTS.RUN_METRIC_SELECTED, {
        metricName: 'f1_score',
        isDefault: false,
        benchmarkName: 'ARC Easy',
      });
    });
  });

  describe('Evaluations Run Parameter Changed', () => {
    it('should fire parameter changed events for each parameter on submit', async () => {
      const renderResult = renderForm();

      act(() => {
        renderResult.result.current.setShowAdditionalArgs(true);
      });

      await act(async () => {
        renderResult.result.current.handleAdditionalArgsTextChange(
          {} as React.ChangeEvent<HTMLTextAreaElement>,
          '{"num_examples": 10, "temperature": 0.5}',
        );
      });

      act(() => {
        renderResult.result.current.setEvaluationName('Test Eval');
      });

      act(() => {
        renderResult.result.current.handleModelDropdownSelect('model-a', mockInferenceServices);
      });

      await act(async () => {
        await renderResult.result.current.handleSubmit();
      });

      const paramCalls = mockFireMisc.mock.calls.filter(
        ([event]) => event === EVAL_HUB_EVENTS.RUN_PARAMETER_CHANGED,
      );
      expect(paramCalls).toHaveLength(2);

      expect(paramCalls[0][1]).toEqual({
        parameterName: 'num_examples',
        parameterValueShape: 'number',
        benchmarkName: 'ARC Easy',
        isDefault: false,
      });

      expect(paramCalls[1][1]).toEqual({
        parameterName: 'temperature',
        parameterValueShape: 'number',
        benchmarkName: 'ARC Easy',
        isDefault: false,
      });
    });

    it('should not fire parameter changed events when no additional args are provided', async () => {
      const renderResult = renderForm();

      act(() => {
        renderResult.result.current.handleModelDropdownSelect('model-a', mockInferenceServices);
      });

      await act(async () => {
        await renderResult.result.current.handleSubmit();
      });

      const paramCalls = mockFireMisc.mock.calls.filter(
        ([event]) => event === EVAL_HUB_EVENTS.RUN_PARAMETER_CHANGED,
      );
      expect(paramCalls).toHaveLength(0);
    });
  });

  describe('Successful evaluation run submission', () => {
    it('should navigate to the Runs tab after submitting the form', async () => {
      const renderResult = renderForm();

      act(() => {
        renderResult.result.current.handleModelDropdownSelect('model-a', mockInferenceServices);
      });

      await act(async () => {
        await renderResult.result.current.handleSubmit();
      });

      expect(mockNavigate).toHaveBeenCalledWith({
        pathname: '/evaluation/test-ns',
        search: '?tab=runs',
      });
    });
  });

  describe('Evaluation run cancellation', () => {
    it('should track cancellation and notify the parent when a close handler is provided', () => {
      const onCancel = jest.fn();
      const renderResult = renderForm({ trackingSource: 'copy_suite', onCancel });

      act(() => {
        renderResult.result.current.setEvaluationName('Copied suite evaluation');
        renderResult.result.current.setShowAdditionalArgs(true);
        renderResult.result.current.handleAdditionalArgsTextChange(
          {} as React.ChangeEvent<HTMLTextAreaElement>,
          '{"num_examples": 10}',
        );
      });

      act(() => {
        renderResult.result.current.handleCancel();
      });

      expect(mockFireForm).toHaveBeenCalledWith(EVAL_HUB_EVENTS.EVALUATION_RUN_STARTED, {
        source: 'copy_suite',
        evaluationName: 'Copied suite evaluation',
        sourceType: 'model',
        hasAPIKey: false,
        hasAdditionalArguments: true,
        outcome: TrackingOutcome.cancel,
      });
      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Evaluation run submission', () => {
    it('should notify the parent and track the configured source after a successful submission', async () => {
      const onSuccess = jest.fn();
      const renderResult = renderForm({ trackingSource: 'copy_suite', onSuccess });

      act(() => {
        renderResult.result.current.handleModelDropdownSelect('model-a', mockInferenceServices);
      });

      await act(async () => {
        await renderResult.result.current.handleSubmit();
      });

      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(mockFireForm).toHaveBeenCalledWith(
        EVAL_HUB_EVENTS.EVALUATION_RUN_STARTED,
        expect.objectContaining({
          source: 'copy_suite',
          outcome: TrackingOutcome.submit,
          success: true,
        }),
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should submit when advisory compatibility fails and a collection omits provider IDs', async () => {
      mockHardwareProfiles = [mockCompatibleHardwareProfile];
      mockKueueAvailability = mockKueueEnabled;
      mockHardwareProfileCompatibilityError = new Error('Provider lookup unavailable');
      const renderResult = renderForm({
        benchmark: undefined,
        collection: { ...mockCollection, benchmarks: [{ id: 'mmlu' }] },
        isCollectionFlow: true,
      });

      act(() => {
        renderResult.result.current.handleModelDropdownSelect('model-a', mockInferenceServices);
        renderResult.result.current.setExperimentMode('new');
        renderResult.result.current.setNewExperimentName('EvalHub');
        renderResult.result.current.setHardwareProfile(mockCompatibleHardwareProfile.name);
      });
      await waitFor(() => expect(renderResult.result.current.isValid).toBe(true));

      await act(async () => {
        await renderResult.result.current.handleSubmit();
      });

      expect(mockGetHardwareProfiles).toHaveBeenCalledWith('', 'test-ns');
      expect(mockCreateEvaluationJob).toHaveBeenCalledTimes(1);
      expect(mockCreateEvaluationJob.mock.calls[0][2]).toEqual(
        expect.objectContaining({
          hardware_config: { hardware_profile_name: mockCompatibleHardwareProfile.name },
        }),
      );
    });

    it('should omit stale profile and queue settings when Kueue is disabled during reconfigure', async () => {
      mockKueueAvailability = {
        ...mockKueueEnabled,
        enabled: false,
        scheduling_ready: false,
        local_queue_names: [],
      };
      const renderResult = renderForm({ initialValues: reconfigureValues });

      await waitFor(() => expect(renderResult.result.current.isValid).toBe(true));
      expect(renderResult.result.current.hardwareProfile).toBeUndefined();

      await act(async () => {
        await renderResult.result.current.handleSubmit();
      });

      expect(mockGetHardwareProfiles).not.toHaveBeenCalled();
      expect(mockCreateEvaluationJob.mock.calls[0][2]).not.toHaveProperty('hardware_config');
    });

    it('should reject a reconfigured profile that is absent from the current LocalQueues', () => {
      mockKueueAvailability = mockKueueEnabled;
      mockHardwareProfiles = [
        { ...mockCompatibleHardwareProfile, local_queue_name: 'unavailable-queue' },
      ];
      const renderResult = renderForm({ initialValues: reconfigureValues });

      expect(renderResult.result.current.isValid).toBe(false);
      expect(renderResult.result.current.hardwareProfile).toBeUndefined();
    });

    it('should stop submission when the selected profile disappears after loading', async () => {
      mockKueueAvailability = mockKueueEnabled;
      mockHardwareProfiles = [mockCompatibleHardwareProfile];
      mockGetHardwareProfiles.mockReturnValue(() => Promise.resolve([]));
      const renderResult = renderForm();

      act(() => {
        renderResult.result.current.handleModelDropdownSelect('model-a', mockInferenceServices);
        renderResult.result.current.setExperimentMode('new');
        renderResult.result.current.setNewExperimentName('EvalHub');
        renderResult.result.current.setHardwareProfile(mockCompatibleHardwareProfile.name);
      });
      await waitFor(() => expect(renderResult.result.current.isValid).toBe(true));

      await act(async () => {
        await renderResult.result.current.handleSubmit();
      });

      expect(mockCreateEvaluationJob).not.toHaveBeenCalled();
      expect(mockNotificationError).toHaveBeenCalledWith(
        'Failed to start evaluation',
        expect.stringContaining('no longer available'),
      );
    });
  });

  describe('No tracking on initial render', () => {
    it('should not fire any tracking events on initial render', () => {
      renderForm();

      expect(mockFireMisc).not.toHaveBeenCalled();
      expect(mockFireForm).not.toHaveBeenCalled();
    });
  });
});
