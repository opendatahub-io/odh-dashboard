/* eslint-disable camelcase */
import { act } from '@testing-library/react';
import {
  fireFormTrackingEvent,
  fireMiscTrackingEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';
import type { FlatBenchmark, Collection, InferenceServiceItem } from '~/app/types';
import {
  useStartEvaluationRunForm,
  EXTERNAL_ENDPOINT_VALUE,
} from '~/app/pages/useStartEvaluationRunForm';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
  fireMiscTrackingEvent: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(() => jest.fn()),
}));

jest.mock('~/app/api/k8s', () => ({
  createEvaluationJob: jest.fn(() => () => Promise.resolve({})),
}));

jest.mock('~/app/hooks/useNotification', () => ({
  useNotification: () => ({
    success: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock('~/app/hooks/useConnectionValidation', () => ({
  useConnectionValidation: () => ({
    connectionValidation: { status: 'idle' },
    setConnectionValidation: jest.fn(),
    handleVerifyConnection: jest.fn(),
  }),
}));

const mockFireMisc = jest.mocked(fireMiscTrackingEvent);
const mockFireForm = jest.mocked(fireFormTrackingEvent);

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

  describe('No tracking on initial render', () => {
    it('should not fire any tracking events on initial render', () => {
      renderForm();

      expect(mockFireMisc).not.toHaveBeenCalled();
      expect(mockFireForm).not.toHaveBeenCalled();
    });
  });
});
