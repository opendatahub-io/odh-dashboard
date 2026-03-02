import * as React from 'react';
import { ActionsColumn, IAction, Td, Tr } from '@patternfly/react-table';
import {
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Tooltip,
} from '@patternfly/react-core';
import { EvaluationJob } from '~/app/types';
import {
  formatDate,
  getBenchmarkName,
  getEvaluationName,
  getResultDisplay,
} from '~/app/utilities/evaluationUtils';
import EvaluationStatusLabel from './EvaluationStatusLabel';

type EvaluationsTableRowProps = {
  job: EvaluationJob;
  rowIndex: number;
};

const IN_PROGRESS_STATES = new Set(['running', 'pending']);

type ConfirmAction = 'stop' | 'delete' | null;

const EvaluationsTableRow: React.FC<EvaluationsTableRowProps> = ({ job, rowIndex }) => {
  const [confirmAction, setConfirmAction] = React.useState<ConfirmAction>(null);
  const evaluationName = getEvaluationName(job);
  const benchmarkName = getBenchmarkName(job);
  const isInProgress = IN_PROGRESS_STATES.has(job.status.state);

  const handleConfirm = () => {
    // TODO: call stop/delete API based on confirmAction
    setConfirmAction(null);
  };

  const actions: IAction[] = [
    ...(isInProgress
      ? [
          {
            title: 'Stop',
            onClick: () => setConfirmAction('stop'),
          },
        ]
      : []),
    {
      title: 'Delete',
      onClick: () => setConfirmAction('delete'),
    },
  ];

  return (
    <>
      <Tr data-testid={`evaluation-row-${rowIndex}`}>
        <Td dataLabel="Evaluation name" data-testid="evaluation-name">
          <Button variant="link" isInline data-testid={`evaluation-link-${rowIndex}`}>
            {evaluationName}
          </Button>
        </Td>
        <Td dataLabel="Status" data-testid="evaluation-status">
          <EvaluationStatusLabel state={job.status.state} />
        </Td>
        <Td dataLabel="Collection/Benchmark" data-testid="evaluation-benchmark">
          <Tooltip content={benchmarkName}>
            <span>{benchmarkName}</span>
          </Tooltip>
        </Td>
        <Td dataLabel="Type" data-testid="evaluation-type">
          {job.model.name}
        </Td>
        <Td dataLabel="Run date" data-testid="evaluation-run-date">
          {formatDate(job.resource.created_at)}
        </Td>
        <Td dataLabel="Result" data-testid="evaluation-result">
          {getResultDisplay(job)}
        </Td>
        <Td isActionCell data-testid="evaluation-kebab">
          <ActionsColumn items={actions} />
        </Td>
      </Tr>

      <Modal
        isOpen={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        variant="small"
        aria-label={confirmAction === 'stop' ? 'Stop evaluation run' : 'Delete evaluation run'}
        data-testid={`evaluation-${confirmAction}-modal`}
      >
        <ModalHeader
          title={confirmAction === 'stop' ? 'Stop evaluation run' : 'Delete evaluation run'}
          titleIconVariant="warning"
        />
        <ModalBody>
          {confirmAction === 'stop'
            ? 'By stopping this evaluation run you will cancel this evaluation process.'
            : 'By deleting this evaluation run you will be removing it from the list of evaluation reports.'}
        </ModalBody>
        <ModalFooter>
          <Button
            variant="primary"
            isDanger
            onClick={handleConfirm}
            data-testid={`evaluation-${confirmAction}-confirm`}
          >
            Confirm
          </Button>
          <Button
            variant="link"
            onClick={() => setConfirmAction(null)}
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
