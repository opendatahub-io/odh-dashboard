import * as React from 'react';
import { ActionsColumn, TableText, Td, Tr } from '@patternfly/react-table';
import { Link, useNavigate } from 'react-router-dom';
import { PipelineRunJobKF } from '~/concepts/pipelines/kfTypes';
import { TableRowTitleDescription, CheckboxTd } from '~/components/table';
import {
  RunJobScheduled,
  RunJobStatus,
  RunJobTrigger,
  CoreResourceExperiment,
  CoreResourcePipelineVersion,
} from '~/concepts/pipelines/content/tables/renderUtils';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import usePipelineRunVersionInfo from '~/concepts/pipelines/content/tables/usePipelineRunVersionInfo';

type PipelineRunJobTableRowProps = {
  isChecked: boolean;
  onToggleCheck: () => void;
  onDelete: () => void;
  job: PipelineRunJobKF;
};

const PipelineRunJobTableRow: React.FC<PipelineRunJobTableRowProps> = ({
  isChecked,
  onToggleCheck,
  onDelete,
  job,
}) => {
  const navigate = useNavigate();
  const { namespace, api, refreshAllAPI } = usePipelinesAPI();
  const { version, isVersionLoaded, error } = usePipelineRunVersionInfo(job);

  return (
    <Tr>
      <CheckboxTd id={job.id} isChecked={isChecked} onToggle={onToggleCheck} />
      <Td dataLabel="Name">
        <TableRowTitleDescription
          title={
            <Link to={`/pipelineRuns/${namespace}/pipelineRunJob/view/${job.id}`}>
              <TableText wrapModifier="truncate">{job.name}</TableText>
            </Link>
          }
          description={job.description}
          descriptionAsMarkdown
        />
      </Td>
      <Td dataLabel="Experiment">
        <CoreResourceExperiment resource={job} />
      </Td>
      <Td modifier="truncate" dataLabel="Pipeline">
        <CoreResourcePipelineVersion
          resource={job}
          loaded={isVersionLoaded}
          version={version}
          error={error}
        />
      </Td>
      <Td dataLabel="Trigger">
        <RunJobTrigger job={job} />
      </Td>
      <Td dataLabel="Scheduled">
        <RunJobScheduled job={job} />
      </Td>
      <Td dataLabel="Status">
        <RunJobStatus
          job={job}
          onToggle={(checked) => api.updatePipelineRunJob({}, job.id, checked).then(refreshAllAPI)}
        />
      </Td>
      <Td isActionCell dataLabel="Kebab">
        <ActionsColumn
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
        />
      </Td>
    </Tr>
  );
};

export default PipelineRunJobTableRow;
