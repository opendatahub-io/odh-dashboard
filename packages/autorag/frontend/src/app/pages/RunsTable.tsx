import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Label, Timestamp, TimestampFormat } from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { CheckCircleIcon } from '@patternfly/react-icons/dist/esm/icons/check-circle-icon';
import { ExclamationCircleIcon } from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';
import { SyncAltIcon } from '@patternfly/react-icons/dist/esm/icons/sync-alt-icon';
import { PendingIcon } from '@patternfly/react-icons/dist/esm/icons/pending-icon';
import { BanIcon } from '@patternfly/react-icons/dist/esm/icons/ban-icon';
import { PipelineRunKF, RuntimeStateKF } from '~/app/types/pipeline';

type RunsTableProps = {
  runs: PipelineRunKF[];
};

const getStatusLabel = (state: string) => {
  switch (state) {
    case RuntimeStateKF.SUCCEEDED:
    case 'SUCCEEDED':
      return (
        <Label color="green" icon={<CheckCircleIcon />}>
          Succeeded
        </Label>
      );
    case RuntimeStateKF.FAILED:
    case 'FAILED':
      return (
        <Label color="red" icon={<ExclamationCircleIcon />}>
          Failed
        </Label>
      );
    case RuntimeStateKF.RUNNING:
    case 'RUNNING':
      return (
        <Label color="blue" icon={<SyncAltIcon />}>
          Running
        </Label>
      );
    case RuntimeStateKF.PENDING:
    case 'PENDING':
      return <Label icon={<PendingIcon />}>Pending</Label>;
    case RuntimeStateKF.CANCELED:
    case 'CANCELED':
      return (
        <Label color="orange" icon={<BanIcon />}>
          Canceled
        </Label>
      );
    default:
      return <Label>{state}</Label>;
  }
};

const RunsTable: React.FC<RunsTableProps> = ({ runs }) => {
  const navigate = useNavigate();

  return (
    <Table aria-label="AutoRAG pipeline runs" variant="compact">
      <Thead>
        <Tr>
          <Th>Name</Th>
          <Th>Status</Th>
          <Th>Created</Th>
          <Th>Duration</Th>
        </Tr>
      </Thead>
      <Tbody>
        {runs.map((run) => {
          const duration =
            run.finished_at && run.created_at
              ? Math.round(
                  (new Date(run.finished_at).getTime() - new Date(run.created_at).getTime()) / 1000,
                )
              : undefined;
          const durationStr = duration ? `${Math.floor(duration / 60)}m ${duration % 60}s` : '-';

          return (
            <Tr key={run.run_id} isClickable onRowClick={() => navigate(`runs/${run.run_id}`)}>
              <Td dataLabel="Name">{run.display_name}</Td>
              <Td dataLabel="Status">{getStatusLabel(run.state)}</Td>
              <Td dataLabel="Created">
                <Timestamp date={new Date(run.created_at)} dateFormat={TimestampFormat.long} />
              </Td>
              <Td dataLabel="Duration">{durationStr}</Td>
            </Tr>
          );
        })}
      </Tbody>
    </Table>
  );
};

export default RunsTable;
