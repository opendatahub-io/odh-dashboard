import * as React from 'react';
import { ActionsColumn, ExpandableRowContent, Td } from '@patternfly/react-table';
import { useNavigate } from 'react-router-dom';
import { PipelineRunJobKF } from '~/concepts/pipelines/kfTypes';
import { TableRowTitleDescription, CheckboxCell } from '~/components/table';
import {
  RunJobScheduled,
  RunJobStatus,
  RunJobTrigger,
  CoreResourceExperiment,
  CoreResourcePipeline,
} from '~/concepts/pipelines/content/tables/renderUtils';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { EitherNotBoth } from '~/typeHelpers';

type PipelineRunJobTableRowProps = {
  onDelete: () => void;
  job: PipelineRunJobKF;
} & EitherNotBoth<{ isExpandable: true }, { isChecked: boolean; onToggleCheck: () => void }>;

const PipelineRunJobTableRow: React.FC<PipelineRunJobTableRowProps> = ({
  isChecked,
  onToggleCheck,
  onDelete,
  isExpandable,
  job,
}) => {
  const navigate = useNavigate();
  const { namespace, api, refreshAllAPI } = usePipelinesAPI();

  const cells = [
    !isExpandable ? (
      <CheckboxCell id={job.id} isChecked={isChecked} onToggle={onToggleCheck} />
    ) : (
      <></>
    ),
    <TableRowTitleDescription key="title-cell" title={job.name} description={job.description} />,
    !isExpandable && <CoreResourceExperiment resource={job} />,
    <CoreResourcePipeline key="pipeline-cell" resource={job} namespace={namespace} />,
    <RunJobTrigger key="trigger-cell" job={job} />,
    <RunJobScheduled key="scheduled-cell" job={job} />,
    <RunJobStatus
      key="status-cell"
      job={job}
      onToggle={(checked) => api.updatePipelineRunJob({}, job.id, checked).then(refreshAllAPI)}
    />,
    <ActionsColumn
      key="actions-cell"
      items={[
        {
          title: 'Duplicate',
          onClick: () => {
            navigate(`/pipelineRuns/${namespace}/pipelineRun/cloneJob/${job.id}`);
          },
        },
        {
          isSeparator: true,
        },
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
          <Td key={index} isActionCell={cell.key === 'actions-cell'}>
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

export default PipelineRunJobTableRow;
