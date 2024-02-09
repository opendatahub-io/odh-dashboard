import * as React from 'react';
import { ActionsColumn, TableText, Td, Tr } from '@patternfly/react-table';
import { Link, useNavigate } from 'react-router-dom';
import { PipelineRunJobKFv2 } from '~/concepts/pipelines/kfTypes';
import { TableRowTitleDescription, CheckboxTd } from '~/components/table';
import {
  RunJobScheduled,
  RunJobStatus,
  RunJobTrigger,
} from '~/concepts/pipelines/content/tables/renderUtils';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import usePipelineRunVersionInfo from '~/concepts/pipelines/content/tables/usePipelineRunVersionInfo';
import useExperimentById from '~/concepts/pipelines/apiHooks/useExperimentById';
import { PipelineVersionLink } from '~/concepts/pipelines/content/PipelineVersionLink';

type PipelineRunJobTableRowProps = {
  isChecked: boolean;
  onToggleCheck: () => void;
  onDelete: () => void;
  job: PipelineRunJobKFv2;
};

const PipelineRunJobTableRow: React.FC<PipelineRunJobTableRowProps> = ({
  isChecked,
  onToggleCheck,
  onDelete,
  job,
}) => {
  const navigate = useNavigate();
  const { namespace, api, refreshAllAPI } = usePipelinesAPI();
  const { version, loaded, error } = usePipelineRunVersionInfo(job);
  const [experiment] = useExperimentById(job.experiment_id);

  return (
    <Tr>
      <CheckboxTd id={job.recurring_run_id} isChecked={isChecked} onToggle={onToggleCheck} />
      <Td dataLabel="Name">
        <TableRowTitleDescription
          title={
            <Link to={`/pipelineRuns/${namespace}/pipelineRunJob/view/${job.recurring_run_id}`}>
              <TableText wrapModifier="truncate">{job.display_name}</TableText>
            </Link>
          }
          description={job.description}
          descriptionAsMarkdown
        />
      </Td>
      <Td dataLabel="Experiment">{experiment?.display_name || 'Default'}</Td>
      <Td modifier="truncate" dataLabel="Pipeline">
        <PipelineVersionLink
          displayName={version?.display_name}
          version={version}
          error={error}
          loaded={loaded}
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
          onToggle={(checked) =>
            api.updatePipelineRunJob({}, job.recurring_run_id, checked).then(refreshAllAPI)
          }
        />
      </Td>
      <Td isActionCell dataLabel="Kebab">
        <ActionsColumn
          items={[
            {
              title: 'Duplicate',
              onClick: () => {
                navigate(`/pipelineRuns/${namespace}/pipelineRun/cloneJob/${job.recurring_run_id}`);
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
