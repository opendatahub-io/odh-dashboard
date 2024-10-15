import * as React from 'react';
import { ActionsColumn, IAction, Td, Tr } from '@patternfly/react-table';
import { useNavigate, useParams } from 'react-router-dom';
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
import usePipelineRunVersionInfo from '~/concepts/pipelines/content/tables/usePipelineRunVersionInfo';
import { PipelineVersionLink } from '~/concepts/pipelines/content/PipelineVersionLink';
import { PipelineRunType } from '~/pages/pipelines/global/runs';
import { RestoreRunModal } from '~/pages/pipelines/global/runs/RestoreRunModal';
import { duplicateRunRoute } from '~/routes';
import { ArchiveRunModal } from '~/pages/pipelines/global/runs/ArchiveRunModal';
import PipelineRunTableRowExperiment from '~/concepts/pipelines/content/tables/pipelineRun/PipelineRunTableRowExperiment';
import { useContextExperimentArchived } from '~/pages/pipelines/global/experiments/ExperimentContext';
import { getDashboardMainContainer } from '~/utilities/utils';
import useExperimentById from '~/concepts/pipelines/apiHooks/useExperimentById';

type PipelineRunTableRowProps = {
  checkboxProps: Omit<React.ComponentProps<typeof CheckboxTd>, 'id'>;
  onDelete?: () => void;
  run: PipelineRunKFv2;
  customCells?: React.ReactNode;
  hasExperiments?: boolean;
  hasRowActions?: boolean;
  runType?: PipelineRunType;
};

const PipelineRunTableRow: React.FC<PipelineRunTableRowProps> = ({
  hasRowActions = true,
  hasExperiments = true,
  checkboxProps,
  customCells,
  onDelete,
  run,
  runType,
}) => {
  const { experimentId, pipelineId, pipelineVersionId } = useParams();
  const { namespace, api, refreshAllAPI } = usePipelinesAPI();
  const notification = useNotification();
  const navigate = useNavigate();
  const { version, loaded: isVersionLoaded, error: versionError } = usePipelineRunVersionInfo(run);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = React.useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = React.useState(false);
  const isExperimentArchived = useContextExperimentArchived();
  const pipelineRunExperimentId = hasExperiments ? run.experiment_id : '';
  const [pipelineRunExperiment, pipelineRunExperimentLoaded] =
    useExperimentById(pipelineRunExperimentId);
  const actions: IAction[] = React.useMemo(() => {
    const duplicateAction: IAction = {
      title: 'Duplicate',
      onClick: () => {
        navigate(
          duplicateRunRoute(namespace, run.run_id, experimentId, pipelineId, pipelineVersionId),
        );
      },
    };

    if (runType === PipelineRunType.ARCHIVED) {
      return [
        {
          title: 'Restore',
          onClick: () => setIsRestoreModalOpen(true),
          isAriaDisabled: isExperimentArchived,
          ...(isExperimentArchived && {
            tooltipProps: {
              content:
                'Archived runs cannot be restored until its associated experiment is restored.',
            },
          }),
        },
        ...(!version && experimentId ? [] : [duplicateAction]),
        {
          isSeparator: true,
        },
        {
          title: 'Delete',
          onClick: () => {
            onDelete?.();
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
      ...(!version && experimentId ? [] : [duplicateAction]),
      {
        isSeparator: true,
      },
      {
        title: 'Archive',
        onClick: () => setIsArchiveModalOpen(true),
      },
    ];
  }, [
    runType,
    run.state,
    run.run_id,
    version,
    isExperimentArchived,
    onDelete,
    api,
    refreshAllAPI,
    notification,
    navigate,
    namespace,
    experimentId,
    pipelineId,
    pipelineVersionId,
  ]);

  return (
    <Tr>
      <CheckboxTd id={run.run_id} {...checkboxProps} />
      <Td
        dataLabel="Name"
        {...(experimentId &&
          customCells && {
            isStickyColumn: true,
            hasRightBorder: true,
            stickyMinWidth: '200px',
            stickyLeftOffset: '45px',
          })}
      >
        <PipelineRunTableRowTitle run={run} />
      </Td>
      {hasExperiments && (
        <PipelineRunTableRowExperiment
          experiment={pipelineRunExperiment}
          loaded={pipelineRunExperimentLoaded}
        />
      )}
      {!pipelineVersionId && (
        <Td modifier="truncate" dataLabel="Pipeline">
          <PipelineVersionLink
            displayName={version?.display_name}
            version={version}
            error={versionError}
            loaded={isVersionLoaded}
          />
        </Td>
      )}
      <Td dataLabel="Created">
        <RunCreated run={run} />
      </Td>
      <Td dataLabel="Duration">
        <RunDuration run={run} />
      </Td>
      <Td dataLabel="Status">
        <RunStatus justIcon run={run} />
      </Td>
      {customCells}
      {hasRowActions && (
        <Td isActionCell dataLabel="Kebab">
          <ActionsColumn
            data-testid="pipeline-run-table-row-actions"
            items={actions}
            popperProps={{ appendTo: getDashboardMainContainer, position: 'right' }}
          />
          {isRestoreModalOpen ? (
            <RestoreRunModal runs={[run]} onCancel={() => setIsRestoreModalOpen(false)} />
          ) : null}
          {isArchiveModalOpen ? (
            <ArchiveRunModal runs={[run]} onCancel={() => setIsArchiveModalOpen(false)} />
          ) : null}
        </Td>
      )}
    </Tr>
  );
};

export default PipelineRunTableRow;
