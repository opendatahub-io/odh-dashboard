import * as React from 'react';
import { ActionsColumn, ExpandableRowContent, Td } from '@patternfly/react-table';
import { Link } from 'react-router-dom';
import { Skeleton } from '@patternfly/react-core';
import { PipelineRunKF } from '~/concepts/pipelines/kfTypes';
import TableRowTitleDescription from '~/components/table/TableRowTitleDescription';
import {
  RunCreated,
  RunDuration,
  CoreResourceExperiment,
  CoreResourcePipeline,
  RunStatus,
} from '~/concepts/pipelines/content/tables/renderUtils';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import CheckboxCell from '~/components/table/CheckboxCell';
import { GetJobInformation } from '~/concepts/pipelines/content/tables/pipelineRun/useJobRelatedInformation';
import { EitherNotBoth } from '~/typeHelpers';

type PipelineRunTableRowProps = {
  onDelete: () => void;
  run: PipelineRunKF;
  getJobInformation: GetJobInformation;
} & EitherNotBoth<{ isExpandable: true }, { isChecked: boolean; onToggleCheck: () => void }>;

const PipelineRunTableRow: React.FC<PipelineRunTableRowProps> = ({
  isChecked,
  onToggleCheck,
  onDelete,
  run,
  isExpandable,
  getJobInformation,
}) => {
  const { namespace } = usePipelinesAPI();
  const { loading, data } = getJobInformation(run);

  const loadingState = <Skeleton />;

  const cells = [
    !isExpandable ? (
      <CheckboxCell id={run.id} isChecked={isChecked} onToggle={onToggleCheck} />
    ) : (
      <></>
    ),
    loading ? (
      loadingState
    ) : (
      <TableRowTitleDescription
        title={
          <Link to={`/pipelineRuns/${namespace}/pipelineRun/view/${run.id}`}>
            {data ? `Run of ${data.name}` : run.name}
          </Link>
        }
        description={
          data
            ? `${run.name}\n${run.description ?? ''}\n${data.description ?? ''}`
            : run.description
        }
        descriptionAsMarkdown
      />
    ),
    !isExpandable && <CoreResourceExperiment resource={run} />,
    loading ? loadingState : <CoreResourcePipeline resource={data || run} namespace={namespace} />,
    <RunCreated key="created-cell" run={run} />,
    <RunDuration key="duration-cell" run={run} />,
    <RunStatus key="status-cell" justIcon run={run} />,
    <ActionsColumn
      key="action-cell"
      items={[
        {
          title: 'Delete',
          onClick: () => {
            onDelete();
          },
        },
      ]}
    />,
  ];

  return (
    <>
      {cells.map((cell, index) =>
        cell ? (
          <Td key={index} isActionCell={cell.key === 'action-cell'}>
            {isExpandable ? (
              <ExpandableRowContent key={`expandable-cell-${index}`}>{cell}</ExpandableRowContent>
            ) : (
              cell
            )}
          </Td>
        ) : undefined,
      )}
    </>
  );
};

export default PipelineRunTableRow;
