import * as React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { useNavigate } from 'react-router-dom';
import { PipelineRunKFv2, RuntimeStateKF } from '~/concepts/pipelines/kfTypes';
import { CheckboxTd } from '~/components/table';
import {
  RunCreated,
  RunDuration,
  RunStatus,
} from '~/concepts/pipelines/content/tables/renderUtils';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { GetJobInformation } from '~/concepts/pipelines/context/useJobRelatedInformation';
import PipelineRunTableRowTitle from '~/concepts/pipelines/content/tables/pipelineRun/PipelineRunTableRowTitle';
import useNotification from '~/utilities/useNotification';
import useExperimentById from '~/concepts/pipelines/apiHooks/useExperimentById';
import usePipelineRunVersionInfo from '~/concepts/pipelines/content/tables/usePipelineRunVersionInfo';
import { PipelineVersionLink } from '~/concepts/pipelines/content/PipelineVersionLink';

type PipelineRunTableRowProps = {
  isChecked: boolean;
  onToggleCheck: () => void;
  onDelete: () => void;
  run: PipelineRunKFv2;
  getJobInformation: GetJobInformation;
};

const PipelineRunTableRow: React.FC<PipelineRunTableRowProps> = ({
  isChecked,
  onToggleCheck,
  onDelete,
  run,
}) => {
  const { namespace, api, refreshAllAPI } = usePipelinesAPI();
  const notification = useNotification();
  const navigate = useNavigate();
  const [experiment] = useExperimentById(run.experiment_id);
  const { version, loaded: isVersionLoaded, error: versionError } = usePipelineRunVersionInfo(run);

  return (
    <Tr>
      <CheckboxTd id={run.run_id} isChecked={isChecked} onToggle={onToggleCheck} />
      <Td dataLabel="Name">
        <PipelineRunTableRowTitle run={run} />
      </Td>
      <Td dataLabel="Experiment">{experiment?.display_name || 'Default'}</Td>
      <Td modifier="truncate" dataLabel="Pipeline">
        <PipelineVersionLink
          displayName={version?.display_name}
          version={version}
          error={versionError}
          loaded={isVersionLoaded}
        />
      </Td>
      <Td dataLabel="Created">
        <RunCreated run={run} />
      </Td>
      <Td dataLabel="Duration">
        <RunDuration run={run} />
      </Td>
      <Td dataLabel="Status">
        <RunStatus justIcon run={run} />
      </Td>
      <Td isActionCell dataLabel="Kebab">
        <ActionsColumn
          items={[
            {
              title: 'Stop',
              isDisabled: run.state !== RuntimeStateKF.RUNNING,
              onClick: () => {
                api
                  .stopPipelineRun({}, run.run_id)
                  .then(refreshAllAPI)
                  .catch((e) => notification.error('Unable to stop pipeline run', e.message));
              },
            },
            {
              title: 'Duplicate',
              onClick: () => {
                navigate(`/pipelineRuns/${namespace}/pipelineRun/clone/${run.run_id}`);
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

export default PipelineRunTableRow;
