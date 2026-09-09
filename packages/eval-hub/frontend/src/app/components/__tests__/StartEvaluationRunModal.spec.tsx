/* eslint-disable camelcase */
import * as React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/ui-core';
import { mockEvaluationJob } from '~/__tests__/unit/testUtils/mockEvaluationData';
import { createEvaluationJob } from '~/app/api/k8s';
import StartEvaluationRunModal from '~/app/components/StartEvaluationRunModal';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';
import type { Collection } from '~/app/types';

const mockNavigate = jest.fn();
const mockMlflowSelectorMounted = jest.fn();
const mockMlflowSelectorUnmounted = jest.fn();

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
  fireMiscTrackingEvent: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/concepts/mlflow', () => {
  const actualReact = jest.requireActual<typeof import('react')>('react');

  const MlflowExperimentSelector = ({ isDisabled = false }: { isDisabled?: boolean }) => {
    actualReact.useEffect(() => {
      mockMlflowSelectorMounted(isDisabled);
      return () => mockMlflowSelectorUnmounted(isDisabled);
    }, []);

    return actualReact.createElement(
      'button',
      {
        type: 'button',
        disabled: isDisabled,
        'data-testid': 'mlflow-experiment-selector-probe',
      },
      'MLflow experiment selector',
    );
  };

  return {
    MlflowExperimentSelector,
    useMlflowExperiments: () => ({ data: [{ name: 'EvalHub' }], loaded: true }),
  };
});

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('~/app/api/k8s', () => ({
  createEvaluationJob: jest.fn(() => () => Promise.resolve({})),
}));

jest.mock('~/app/hooks/useConnectionValidation', () => ({
  useConnectionValidation: () => ({
    connectionValidation: { status: 'idle' },
    setConnectionValidation: jest.fn(),
    handleVerifyConnection: jest.fn(),
  }),
}));

jest.mock('~/app/hooks/useInferenceServices', () => ({
  useInferenceServices: () => ({
    inferenceServices: [
      {
        name: 'model-a',
        url: 'https://model-a.example.com/v1',
        ready: true,
      },
    ],
    loaded: true,
    loadError: undefined,
    warning: undefined,
  }),
}));

jest.mock('~/app/hooks/useNotification', () => ({
  useNotification: () => ({
    success: jest.fn(),
    error: jest.fn(),
  }),
}));

const mockCreateEvaluationJob = jest.mocked(createEvaluationJob);
const mockFireFormTrackingEvent = jest.mocked(fireFormTrackingEvent);

const collection: Collection = {
  resource: { id: 'source-suite' },
  name: 'Source suite',
  benchmarks: [{ id: 'benchmark-a', provider_id: 'provider-a' }],
};

const clonedCollection: Collection = {
  ...collection,
  resource: { id: 'cloned-suite' },
  name: 'Copied suite',
};

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

const createDeferred = <T,>(): Deferred<T> => {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
};

type ResolveCollection = NonNullable<
  React.ComponentProps<typeof StartEvaluationRunModal>['resolveCollection']
>;

const renderModal = (
  resolveCollection?: ResolveCollection,
  onClonePendingChange?: (isPending: boolean) => void,
) => {
  const onClose = jest.fn();

  render(
    <MemoryRouter>
      <StartEvaluationRunModal
        isOpen
        onClose={onClose}
        namespace="test-namespace"
        collection={collection}
        isCollectionFlow
        defaultEvaluationName="Copied suite"
        trackingSource="copy_suite"
        resolveCollection={resolveCollection}
        onClonePendingChange={onClonePendingChange}
      />
    </MemoryRouter>,
  );

  return { onClose };
};

const selectClusterModel = async () => {
  fireEvent.click(screen.getByTestId('model-picker-toggle'));

  await waitFor(() => {
    expect(screen.getByTestId('model-picker-toggle')).toHaveAttribute('aria-expanded', 'true');
  });

  const option = screen.getByTestId('model-option-model-a');
  fireEvent.click(within(option).getByRole('option', { hidden: true }));

  await waitFor(() => {
    expect(screen.getByTestId('model-picker-toggle')).toHaveTextContent('model-a');
    expect(screen.getByTestId('start-evaluation-submit')).toBeEnabled();
  });
};

describe('StartEvaluationRunModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateEvaluationJob.mockReturnValue(() => Promise.resolve(mockEvaluationJob()));
  });

  it('should disable fields and prevent a deferred clone from submitting after cancel', async () => {
    const deferredClone = createDeferred<Collection | undefined>();
    let cloneSignal: AbortSignal | undefined;
    const resolveCollection = jest.fn((signal?: AbortSignal) => {
      cloneSignal = signal;
      return deferredClone.promise;
    });
    const onClonePendingChange = jest.fn();
    const { onClose } = renderModal(resolveCollection, onClonePendingChange);

    await selectClusterModel();
    fireEvent.click(screen.getByTestId('start-evaluation-run-advanced-toggle'));
    fireEvent.click(screen.getByTestId('show-additional-args'));
    const fileUpload = screen.getByTestId('additional-args-upload');

    fireEvent.click(screen.getByTestId('start-evaluation-submit'));
    await waitFor(() => expect(resolveCollection).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('evaluation-name-input')).toBeDisabled();
    expect(screen.getByTestId('model-picker-toggle')).toBeDisabled();
    expect(screen.getByTestId('start-evaluation-submit')).toBeDisabled();
    expect(screen.getByTestId('start-evaluation-cancel')).toBeEnabled();
    expect(
      within(screen.getByTestId('benchmark-threshold')).getByRole('slider', { hidden: true }),
    ).toHaveAttribute('aria-disabled', 'true');
    const thresholdInput = screen
      .getByTestId('benchmark-threshold')
      .querySelector<HTMLInputElement>('input[type="number"]');
    expect(thresholdInput).not.toBeNull();
    expect(thresholdInput).toBeDisabled();
    expect(fileUpload.querySelector<HTMLInputElement>('input[type="file"]')).toBeDisabled();
    expect(fileUpload.querySelector('textarea')).toBeDisabled();
    expect(onClonePendingChange).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByTestId('start-evaluation-cancel'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(cloneSignal?.aborted).toBe(true);
    expect(onClonePendingChange).toHaveBeenLastCalledWith(false);
    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
      EVAL_HUB_EVENTS.EVALUATION_RUN_STARTED,
      expect.objectContaining({
        source: 'copy_suite',
        evaluationName: 'Copied suite',
        outcome: TrackingOutcome.cancel,
      }),
    );

    await act(async () => {
      deferredClone.resolve(clonedCollection);
      await deferredClone.promise;
    });

    expect(mockCreateEvaluationJob).not.toHaveBeenCalled();
  });

  it('should replace the MLflow selector with a disabled instance while cloning', async () => {
    const deferredClone = createDeferred<Collection | undefined>();
    const resolveCollection = jest.fn(() => deferredClone.promise);
    renderModal(resolveCollection);

    await selectClusterModel();
    fireEvent.click(screen.getByTestId('start-evaluation-run-advanced-toggle'));

    const readySelector = screen.getByTestId('mlflow-experiment-selector-probe');
    expect(readySelector).toBeEnabled();
    expect(mockMlflowSelectorMounted).toHaveBeenLastCalledWith(false);

    fireEvent.click(screen.getByTestId('start-evaluation-submit'));
    await waitFor(() => expect(resolveCollection).toHaveBeenCalledTimes(1));

    await waitFor(() => {
      const disabledSelector = screen.getByTestId('mlflow-experiment-selector-probe');
      expect(disabledSelector).not.toBe(readySelector);
      expect(disabledSelector).toBeDisabled();
      expect(mockMlflowSelectorUnmounted).toHaveBeenCalledWith(false);
      expect(mockMlflowSelectorMounted).toHaveBeenLastCalledWith(true);
    });

    fireEvent.click(screen.getByTestId('start-evaluation-cancel'));
    await act(async () => {
      deferredClone.resolve(clonedCollection);
      await deferredClone.promise;
    });
  });

  it('should prevent a deferred clone from submitting when the modal close control is used', async () => {
    const deferredClone = createDeferred<Collection | undefined>();
    const resolveCollection = jest.fn(() => deferredClone.promise);
    const { onClose } = renderModal(resolveCollection);

    await selectClusterModel();

    fireEvent.click(screen.getByTestId('start-evaluation-submit'));
    expect(resolveCollection).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
      EVAL_HUB_EVENTS.EVALUATION_RUN_STARTED,
      expect.objectContaining({ outcome: TrackingOutcome.cancel }),
    );

    await act(async () => {
      deferredClone.resolve(clonedCollection);
      await deferredClone.promise;
    });

    expect(mockCreateEvaluationJob).not.toHaveBeenCalled();
  });

  it('should submit the evaluation using the cloned collection', async () => {
    const resolveCollection = jest.fn(() => Promise.resolve(clonedCollection));
    renderModal(resolveCollection);

    await selectClusterModel();

    fireEvent.click(screen.getByTestId('start-evaluation-submit'));

    await waitFor(() => expect(mockCreateEvaluationJob).toHaveBeenCalledTimes(1));
    expect(mockCreateEvaluationJob).toHaveBeenCalledWith(
      '',
      'test-namespace',
      expect.objectContaining({
        collection: expect.objectContaining({ id: 'cloned-suite' }),
      }),
    );
  });

  it('should not submit if cloning does not produce a collection', async () => {
    const resolveCollection = jest.fn(() => Promise.resolve(undefined));
    renderModal(resolveCollection);

    await selectClusterModel();

    fireEvent.click(screen.getByTestId('start-evaluation-submit'));

    await waitFor(() => expect(resolveCollection).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId('start-evaluation-submit')).toBeEnabled());
    expect(mockCreateEvaluationJob).not.toHaveBeenCalled();
  });

  it('should not submit if cloning fails', async () => {
    const resolveCollection = jest.fn(() => Promise.reject(new Error('Clone failed')));
    renderModal(resolveCollection);

    await selectClusterModel();

    fireEvent.click(screen.getByTestId('start-evaluation-submit'));

    await waitFor(() => expect(resolveCollection).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId('start-evaluation-submit')).toBeEnabled());
    expect(mockCreateEvaluationJob).not.toHaveBeenCalled();
  });

  it('should not report success or navigate when the job request resolves after cancel', async () => {
    const deferredJob = createDeferred<ReturnType<typeof mockEvaluationJob>>();
    mockCreateEvaluationJob.mockReturnValue(() => deferredJob.promise);
    const { onClose } = renderModal();

    await selectClusterModel();

    fireEvent.click(screen.getByTestId('start-evaluation-submit'));
    await waitFor(() => expect(mockCreateEvaluationJob).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByTestId('start-evaluation-cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);

    await act(async () => {
      deferredJob.resolve(mockEvaluationJob());
      await deferredJob.promise;
    });

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockFireFormTrackingEvent).not.toHaveBeenCalledWith(
      EVAL_HUB_EVENTS.EVALUATION_RUN_STARTED,
      expect.objectContaining({ outcome: TrackingOutcome.submit, success: true }),
    );
  });
});
