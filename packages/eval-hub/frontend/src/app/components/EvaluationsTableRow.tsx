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
import { EvaluationJob } from '~/app/types';
import {
  formatDate,
  getAllBenchmarkNames,
  getBenchmarkName,
  getEvaluationName,
  getResultPass,
  getResultScore,
} from '~/app/utilities/evaluationUtils';
import { cancelEvaluationJob, deleteEvaluationJob } from '~/app/api/k8s';
import EvaluationStatusLabel from './EvaluationStatusLabel';

type EvaluationsTableRowProps = {
  job: EvaluationJob;
  rowIndex: number;
  namespace: string;
  onActionComplete: () => void;
};

const IN_PROGRESS_STATES = new Set(['running', 'pending']);

type ConfirmAction = 'stop' | 'delete' | null;

const EvaluationsTableRow: React.FC<EvaluationsTableRowProps> = ({
  job,
  rowIndex,
  namespace,
  onActionComplete,
}) => {
  const navigate = useNavigate();
  const [confirmAction, setConfirmAction] = React.useState<ConfirmAction>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isStopping, setIsStopping] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const evaluationName = getEvaluationName(job);
  const benchmarkName = getBenchmarkName(job);
  const allBenchmarkNames = getAllBenchmarkNames(job);
  const isInProgress = IN_PROGRESS_STATES.has(job.status.state);
  const displayState = isStopping ? 'stopping' : job.status.state;

  React.useEffect(() => {
    if (!isInProgress) {
      setIsStopping(false);
    }
  }, [isInProgress]);

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
          <EvaluationStatusLabel state={displayState} />
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
        aria-label={confirmAction === 'stop' ? 'Stop evaluation run' : 'Delete evaluation run'}
        data-testid={`evaluation-${confirmAction}-modal`}
      >
        <ModalHeader
          title={confirmAction === 'stop' ? 'Stop evaluation run' : 'Delete evaluation run'}
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
            ? 'By stopping this evaluation run you will cancel this evaluation process.'
            : 'By deleting this evaluation run you will be removing it from the list of evaluation reports.'}
        </ModalBody>
        <ModalFooter>
          <Button
            variant="primary"
            isDanger
            onClick={handleConfirm}
            isLoading={isSubmitting}
            isDisabled={isSubmitting}
            data-testid={`evaluation-${confirmAction}-confirm`}
          >
            Confirm
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
