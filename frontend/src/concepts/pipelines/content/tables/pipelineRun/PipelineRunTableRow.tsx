import * as React from 'react';
import { ActionsColumn, IAction, Td, Tr } from '@patternfly/react-table';
import { useNavigate } from 'react-router-dom';
import { PipelineRunKFv2, RuntimeStateKF } from '~/concepts/pipelines/kfTypes';
import { CheckboxTd } from '~/components/table';
import {
  RunCreated,
  RunDuration,
  RunStatus,
} from '~/concepts/pipelines/content/tables/renderUtils';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import PipelineRunTableRowTitle from '~/concepts/pipelines/content/tables/pipelineRun/PipelineRunTableRowTitle';
import useNotification from '~/utilities/useNotification';
import useExperimentById from '~/concepts/pipelines/apiHooks/useExperimentById';
import usePipelineRunVersionInfo from '~/concepts/pipelines/content/tables/usePipelineRunVersionInfo';
import { PipelineVersionLink } from '~/concepts/pipelines/content/PipelineVersionLink';
import { PipelineRunSearchParam } from '~/concepts/pipelines/content/types';
import { PipelineRunType } from '~/pages/pipelines/global/runs';
import { RestoreRunModal } from '~/pages/pipelines/global/runs/RestoreRunModal';
import { ArchiveRunModal } from '~/pages/pipelines/global/runs/ArchiveRunModal';
import { useGetSearchParamValues } from '~/utilities/useGetSearchParamValues';

type PipelineRunTableRowProps = {
  isChecked: boolean;
  onToggleCheck: () => void;
  onDelete: () => void;
  run: PipelineRunKFv2;
};

const PipelineRunTableRow: React.FC<PipelineRunTableRowProps> = ({
  isChecked,
  onToggleCheck,
  onDelete,
  run,
}) => {
  const { runType } = useGetSearchParamValues([PipelineRunSearchParam.RunType]);
  const { namespace, api, refreshAllAPI } = usePipelinesAPI();
  const notification = useNotification();
  const navigate = useNavigate();
  const [experiment] = useExperimentById(run.experiment_id);
  const { version, loaded: isVersionLoaded, error: versionError } = usePipelineRunVersionInfo(run);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = React.useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = React.useState(false);

  const actions: IAction[] = React.useMemo(() => {
    const cloneAction: IAction = {
      title: 'Duplicate',
      onClick: () => {
        navigate(`/pipelineRuns/${namespace}/pipelineRun/clone/${run.run_id}`);
      },
    };

    if (runType === PipelineRunType.Archived) {
      return [
        {
          title: 'Restore',
          onClick: () => setIsRestoreModalOpen(true),
        },
        cloneAction,
        {
          isSeparator: true,
        },
        {
          title: 'Delete',
          onClick: () => {
            onDelete();
          },
        },
      ];
    }

    return [
      {
        title: 'Stop',
        isDisabled: run.state !== RuntimeStateKF.RUNNING,
        onClick: () => {
          api
            .stopPipelineRun({}, run.run_id)
            .then(refreshAllAPI)
            .catch((e) => notification.error('Unable to stop the pipeline run.', e.message));
        },
      },
      cloneAction,
      {
        isSeparator: true,
      },
      {
        title: 'Archive',
        onClick: () => setIsArchiveModalOpen(true),
      },
    ];
  }, [
    api,
    namespace,
    notification,
    run.run_id,
    run.state,
    runType,
    navigate,
    onDelete,
    refreshAllAPI,
  ]);

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
        <ActionsColumn items={actions} />

        {isRestoreModalOpen && (
          <RestoreRunModal run={run} onCancel={() => setIsRestoreModalOpen(false)} />
        )}
        {isArchiveModalOpen && (
          <ArchiveRunModal run={run} onCancel={() => setIsArchiveModalOpen(false)} />
        )}
      </Td>
    </Tr>
  );
};

export default PipelineRunTableRow;
