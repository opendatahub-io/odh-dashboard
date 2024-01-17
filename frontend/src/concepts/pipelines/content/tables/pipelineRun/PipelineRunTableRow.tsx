import * as React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { useNavigate } from 'react-router-dom';
import { PipelineRunKF, PipelineRunStatusesKF } from '~/concepts/pipelines/kfTypes';
import { CheckboxTd } from '~/components/table';
import {
  RunCreated,
  RunDuration,
  CoreResourceExperiment,
  CoreResourcePipelineVersion,
  RunStatus,
} from '~/concepts/pipelines/content/tables/renderUtils';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { GetJobInformation } from '~/concepts/pipelines/context/useJobRelatedInformation';
import PipelineRunTableRowTitle from '~/concepts/pipelines/content/tables/pipelineRun/PipelineRunTableRowTitle';
import useNotification from '~/utilities/useNotification';
import usePipelineRunVersionInfo from '~/concepts/pipelines/content/tables/usePipelineRunVersionInfo';

type PipelineRunTableRowProps = {
  isChecked: boolean;
  onToggleCheck: () => void;
  onDelete: () => void;
  run: PipelineRunKF;
  getJobInformation: GetJobInformation;
};

const PipelineRunTableRow: React.FC<PipelineRunTableRowProps> = ({
  isChecked,
  onToggleCheck,
  onDelete,
  run,
  getJobInformation,
}) => {
  const { namespace, api, refreshAllAPI } = usePipelinesAPI();
  const { loading: isJobInfoLoading, data } = getJobInformation(run);
  const notification = useNotification();
  const navigate = useNavigate();
  const { version, isVersionLoaded, error } = usePipelineRunVersionInfo(data || run);

  return (
    <Tr>
      <CheckboxTd id={run.id} isChecked={isChecked} onToggle={onToggleCheck} />
      <Td>
        <PipelineRunTableRowTitle resource={run} />
      </Td>
      <Td>
        <CoreResourceExperiment resource={run} />
      </Td>
      <Td modifier="truncate">
        <CoreResourcePipelineVersion
          resource={data || run}
          loaded={!isJobInfoLoading && isVersionLoaded}
          version={version}
          error={error}
        />
      </Td>
      <Td>
        <RunCreated run={run} />
      </Td>
      <Td>
        <RunDuration run={run} />
      </Td>
      <Td>
        <RunStatus justIcon run={run} />
      </Td>
      <Td isActionCell>
        <ActionsColumn
          items={[
            {
              title: 'Stop',
              isDisabled: run.status !== PipelineRunStatusesKF.RUNNING,
              onClick: () => {
                api
                  .stopPipelineRun({}, run.id)
                  .then(refreshAllAPI)
                  .catch((e) => notification.error('Unable to stop pipeline run', e.message));
              },
            },
            {
              title: 'Duplicate',
              onClick: () => {
                navigate(`/pipelineRuns/${namespace}/pipelineRun/clone/${run.id}`);
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
