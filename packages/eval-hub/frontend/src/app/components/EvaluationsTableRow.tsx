import * as React from 'react';
import { ActionsColumn, IAction, Td, Tr } from '@patternfly/react-table';
import {
  Alert,
  Button,
  Checkbox,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Tooltip,
} from '@patternfly/react-core';
import { Link, useNavigate } from 'react-router-dom';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { EvaluationJob, EvaluationJobState } from '~/app/types';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';
import {
  formatDate,
  getAllBenchmarkNames,
  getBenchmarkName,
  getEvaluationName,
  getFailedBenchmarkCount,
  getResultScore,
  isEvaluationJobComparable,
} from '~/app/utilities/evaluationUtils';
import { isPreStartFailure } from '~/app/utilities/evaluationJobPolling';
import { CollectionNameMap } from '~/app/hooks/useCollectionNameMap';
import { deleteEvaluationJob } from '~/app/api/k8s';
import { evaluationReconfigureRoute } from '~/app/routes';
import EvaluationStatusLabel from './EvaluationStatusLabel';
import StopEvaluationModal from './StopEvaluationModal';
import './EvaluationsTableRow.scss';

type EvaluationsTableRowProps = {
  job: EvaluationJob;
  polledJobData?: EvaluationJob;
  rowIndex: number;
  namespace: string;
  collectionNameMap: CollectionNameMap;
  onActionComplete: () => void;
  onShowStatus: (job: EvaluationJob) => void;
  isSelected: boolean;
  onSelectionChange: (checked: boolean) => void;
};

const IN_PROGRESS_STATES = new Set(['running', 'pending', 'stopping']);

const EvaluationsTableRow: React.FC<EvaluationsTableRowProps> = ({
  job,
  polledJobData,
  rowIndex,
  namespace,
  collectionNameMap,
  onActionComplete,
  onShowStatus,
  isSelected,
  onSelectionChange,
}) => {
  const navigate = useNavigate();
  const [showStopModal, setShowStopModal] = React.useState(false);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isStopping, setIsStopping] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const evaluationName = getEvaluationName(job);
  const benchmarkName = getBenchmarkName(job, collectionNameMap);
  const allBenchmarkNames = getAllBenchmarkNames(job);
  const currentState = polledJobData?.status.state ?? job.status.state;
  const isInProgress = IN_PROGRESS_STATES.has(currentState);
  const hasNamespace = !!namespace;
  const canStop =
    (currentState === 'running' || currentState === 'pending') && !isStopping && hasNamespace;
  const isReconfigurable = !IN_PROGRESS_STATES.has(currentState) && hasNamespace;
  const isComparable = isEvaluationJobComparable(job);
  const displayState = isStopping ? 'stopping' : currentState;
  const isPreStart = isPreStartFailure(polledJobData ?? job);
  const effectiveBenchmarks = polledJobData?.status.benchmarks ?? job.status.benchmarks ?? [];

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
    const latestState = job.status.state;
    prevStateRef.current = latestState;

    if (IN_PROGRESS_STATES.has(prevState) && !IN_PROGRESS_STATES.has(latestState)) {
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
        latestState === 'completed'
          ? 'completed'
          : latestState === 'cancelled' || latestState === 'stopped'
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

  const handleStopComplete = React.useCallback(() => {
    setIsStopping(true);
    onActionComplete();
  }, [onActionComplete]);

  const handleDeleteConfirm = async () => {
    if (!namespace) {
      setActionError('Namespace is required to perform this action');
      return;
    }
    setIsSubmitting(true);
    setActionError(null);
    try {
      await deleteEvaluationJob('', namespace, job.resource.id)({});
      fireMiscTrackingEvent(EVAL_HUB_EVENTS.EVALUATION_DELETED, {
        evaluationName,
        previousState: job.status.state,
      });
      setShowDeleteModal(false);
      onActionComplete();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const actions: IAction[] = [
    {
      title: 'View evaluation status',
      onClick: () => onShowStatus(job),
    },
    ...(canStop
      ? [
          {
            title: 'Stop',
            onClick: () => setShowStopModal(true),
          },
        ]
      : []),
    ...(isReconfigurable
      ? [
          {
            title: 'Reconfigure',
            onClick: () => navigate(evaluationReconfigureRoute(namespace, job.resource.id)),
          },
        ]
      : []),
    ...(!isStopping
      ? [
          {
            title: 'Delete',
            isDanger: true,
            onClick: () => setShowDeleteModal(true),
          },
        ]
      : []),
  ];

  return (
    <>
      <Tr data-testid={`evaluation-row-${rowIndex}`}>
        <Td dataLabel="Select evaluation" data-testid={`evaluation-select-${rowIndex}`}>
          <Checkbox
            id={`evaluation-select-checkbox-${job.resource.id}`}
            aria-label={`Select ${evaluationName}`}
            isChecked={isSelected}
            isDisabled={!isComparable}
            onChange={(_event, checked) => onSelectionChange(checked)}
            data-testid={`evaluation-select-checkbox-${rowIndex}`}
          />
        </Td>
        <Td dataLabel="Evaluation name" data-testid="evaluation-name">
          {job.status.state === 'completed' ? (
            <Button
              variant="link"
              isInline
              data-testid={`evaluation-link-${rowIndex}`}
              component={(props) => <Link {...props} to={`results/${job.resource.id}`} />}
            >
              {evaluationName}
            </Button>
          ) : (
            evaluationName
          )}
        </Td>
        <Td dataLabel="Status" data-testid="evaluation-status">
          <EvaluationStatusLabel
            state={displayState}
            isPreStartFailure={isPreStart}
            onClick={() => onShowStatus(job)}
          />
          {(displayState === 'failed' || displayState === 'partially_failed') &&
          effectiveBenchmarks.length > 1 ? (
            <div className="evalhub-table-row__failure-detail" data-testid="failure-detail">
              {getFailedBenchmarkCount(effectiveBenchmarks)} of {effectiveBenchmarks.length}{' '}
              benchmarks failed
            </div>
          ) : null}
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
          {getResultScore(job)}
        </Td>
        <Td isActionCell data-testid="evaluation-kebab">
          {actions.length > 0 && <ActionsColumn items={actions} />}
        </Td>
      </Tr>

      {showStopModal && (
        <StopEvaluationModal
          job={job}
          namespace={namespace}
          onClose={() => setShowStopModal(false)}
          onComplete={handleStopComplete}
        />
      )}

      {showDeleteModal && (
        <Modal
          isOpen
          onClose={() => {
            if (isSubmitting) {
              return;
            }
            setShowDeleteModal(false);
            setActionError(null);
          }}
          variant="small"
          aria-label="Delete evaluation run?"
          data-testid="evaluation-delete-modal"
        >
          <ModalHeader title="Delete evaluation run?" titleIconVariant="warning" />
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
            {`The ${evaluationName} evaluation run and its results will be deleted.`}
          </ModalBody>
          <ModalFooter>
            <Button
              variant="danger"
              onClick={handleDeleteConfirm}
              isLoading={isSubmitting}
              isDisabled={isSubmitting}
              data-testid="evaluation-delete-confirm"
            >
              Delete
            </Button>
            <Button
              variant="link"
              onClick={() => {
                setShowDeleteModal(false);
                setActionError(null);
              }}
              isDisabled={isSubmitting}
              data-testid="evaluation-delete-cancel"
            >
              Cancel
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </>
  );
};

export default EvaluationsTableRow;
