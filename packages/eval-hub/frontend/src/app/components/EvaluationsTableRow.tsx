import * as React from 'react';
import { ActionsColumn, IAction, Td, Tr } from '@patternfly/react-table';
import {
  Alert,
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Tooltip,
} from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { EvaluationJob, EvaluationJobState } from '~/app/types';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';
import {
  formatDate,
  getAllBenchmarkNames,
  getBenchmarkName,
  getEvaluationName,
  getResultPass,
  getResultScore,
} from '~/app/utilities/evaluationUtils';
import { CollectionNameMap } from '~/app/hooks/useCollectionNameMap';
import { cancelEvaluationJob, deleteEvaluationJob } from '~/app/api/k8s';
import EvaluationStatusLabel from './EvaluationStatusLabel';

type EvaluationsTableRowProps = {
  job: EvaluationJob;
  rowIndex: number;
  namespace: string;
  collectionNameMap: CollectionNameMap;
  onActionComplete: () => void;
};

const IN_PROGRESS_STATES = new Set(['running', 'pending', 'stopping']);

type ConfirmAction = 'stop' | 'delete' | null;

const EvaluationsTableRow: React.FC<EvaluationsTableRowProps> = ({
  job,
  rowIndex,
  namespace,
  collectionNameMap,
  onActionComplete,
}) => {
  const navigate = useNavigate();
  const [confirmAction, setConfirmAction] = React.useState<ConfirmAction>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isStopping, setIsStopping] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const evaluationName = getEvaluationName(job);
  const benchmarkName = getBenchmarkName(job, collectionNameMap);
  const allBenchmarkNames = getAllBenchmarkNames(job);
  const isInProgress = IN_PROGRESS_STATES.has(job.status.state);
  const displayState = isStopping ? 'stopping' : job.status.state;

  React.useEffect(() => {
    if (!isInProgress) {
      setIsStopping(false);
    }
  }, [isInProgress]);

  // Snapshot latest job data in a ref so the completion-tracking effect can
  // read current values without being re-triggered by them.
  const completionTrackingDataRef = React.useRef({
    evaluationName,
    benchmarkTypes: JSON.stringify(allBenchmarkNames),
    createdAt: job.resource.created_at,
    updatedAt: job.resource.updated_at,
    errorMessage: job.status.message?.message,
  });
  completionTrackingDataRef.current = {
    evaluationName,
    benchmarkTypes: JSON.stringify(allBenchmarkNames),
    createdAt: job.resource.created_at,
    updatedAt: job.resource.updated_at,
    errorMessage: job.status.message?.message,
  };

  const prevStateRef = React.useRef<EvaluationJobState>(job.status.state);

  React.useEffect(() => {
    const prevState = prevStateRef.current;
    const currentState = job.status.state;
    prevStateRef.current = currentState;

    if (IN_PROGRESS_STATES.has(prevState) && !IN_PROGRESS_STATES.has(currentState)) {
      const {
        evaluationName: evalName,
        benchmarkTypes,
        createdAt,
        updatedAt,
        errorMessage,
      } = completionTrackingDataRef.current;

      const durationMs =
        createdAt && updatedAt
          ? new Date(updatedAt).getTime() - new Date(createdAt).getTime()
          : undefined;

      const runOutcome: 'completed' | 'failed' | 'cancelled' =
        currentState === 'completed'
          ? 'completed'
          : currentState === 'cancelled' || currentState === 'stopped'
            ? 'cancelled'
            : 'failed';

      fireMiscTrackingEvent(EVAL_HUB_EVENTS.EVALUATION_COMPLETED, {
        evaluationName: evalName,
        runOutcome,
        durationMs,
        benchmarkTypes,
        error: errorMessage,
      });
    }
  }, [job.status.state]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConfirm = async () => {
    if (!namespace) {
      setActionError('Namespace is required to perform this action');
      return;
    }
    const isStop = confirmAction === 'stop';
    setIsSubmitting(true);
    setActionError(null);
    try {
      const apiCall = isStop
        ? cancelEvaluationJob('', namespace, job.resource.id)
        : deleteEvaluationJob('', namespace, job.resource.id);
      if (isStop) {
        setConfirmAction(null);
        setIsStopping(true);
      }
      await apiCall({});
      if (!isStop) {
        fireMiscTrackingEvent(EVAL_HUB_EVENTS.EVALUATION_DELETED, {
          evaluationName,
          previousState: job.status.state,
        });
      }
      setConfirmAction(null);
      onActionComplete();
    } catch (e) {
      setIsStopping(false);
      if (isStop) {
        setConfirmAction('stop');
      }
      setActionError(e instanceof Error ? e.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const actions: IAction[] = [
    ...(isInProgress && !isStopping
      ? [
          {
            title: 'Stop',
            onClick: () => setConfirmAction('stop'),
          },
        ]
      : []),
    ...(!isStopping
      ? [
          {
            title: 'Delete',
            onClick: () => setConfirmAction('delete'),
          },
        ]
      : []),
  ];

  return (
    <>
      <Tr data-testid={`evaluation-row-${rowIndex}`}>
        <Td dataLabel="Evaluation name" data-testid="evaluation-name">
          {job.status.state === 'completed' ? (
            <Button
              variant="link"
              isInline
              data-testid={`evaluation-link-${rowIndex}`}
              onClick={() => navigate(`results/${job.resource.id}`)}
            >
              {evaluationName}
            </Button>
          ) : (
            evaluationName
          )}
        </Td>
        <Td dataLabel="Status" data-testid="evaluation-status">
          <EvaluationStatusLabel state={displayState} message={job.status.message?.message} />
        </Td>
        <Td dataLabel="Evaluation" data-testid="evaluation-benchmark">
          <Tooltip
            content={
              allBenchmarkNames.length > 1 ? (
                <div>
                  {allBenchmarkNames.map((name) => (
                    <div key={name}>{name}</div>
                  ))}
                </div>
              ) : (
                benchmarkName
              )
            }
          >
            <span>{benchmarkName}</span>
          </Tooltip>
        </Td>
        <Td dataLabel="Evaluated" data-testid="evaluation-type">
          {job.model.name}
        </Td>
        <Td dataLabel="Run date" data-testid="evaluation-run-date">
          {formatDate(job.resource.created_at)}
        </Td>
        <Td dataLabel="Result" data-testid="evaluation-result">
          {allBenchmarkNames.length > 1 || getResultPass(job) === false ? '-' : getResultScore(job)}
        </Td>
        <Td isActionCell data-testid="evaluation-kebab">
          {actions.length > 0 && <ActionsColumn items={actions} />}
        </Td>
      </Tr>

      <Modal
        isOpen={confirmAction !== null}
        onClose={() => {
          if (isSubmitting) {
            return;
          }
          setConfirmAction(null);
          setActionError(null);
        }}
        variant="small"
        aria-label={confirmAction === 'stop' ? 'Stop evaluation?' : 'Delete evaluation run?'}
        data-testid={`evaluation-${confirmAction}-modal`}
      >
        <ModalHeader
          title={confirmAction === 'stop' ? 'Stop evaluation?' : 'Delete evaluation run?'}
          titleIconVariant="warning"
        />
        <ModalBody>
          {actionError && (
            <Alert
              variant="danger"
              isInline
              isPlain
              title={actionError}
              className="pf-v6-u-mb-md"
            />
          )}
          {confirmAction === 'stop'
            ? `The ${evaluationName} evaluation will be stopped, and its progress will be lost.`
            : `The ${evaluationName} evaluation run and its results will be deleted.`}
        </ModalBody>
        <ModalFooter>
          <Button
            variant="danger"
            onClick={handleConfirm}
            isLoading={isSubmitting}
            isDisabled={isSubmitting}
            data-testid={`evaluation-${confirmAction}-confirm`}
          >
            {confirmAction === 'stop' ? 'Stop evaluation' : 'Delete'}
          </Button>
          <Button
            variant="link"
            onClick={() => {
              setConfirmAction(null);
              setActionError(null);
            }}
            isDisabled={isSubmitting}
            data-testid={`evaluation-${confirmAction}-cancel`}
          >
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export default EvaluationsTableRow;
