import * as React from 'react';
import { Divider, Dropdown, DropdownItem, MenuToggle, DropdownList } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import useNotification from '#~/utilities/useNotification';
import { PipelineRunKF, RuntimeStateKF, StorageStateKF } from '#~/concepts/pipelines/kfTypes';
import { compareRunsRoute, duplicateRunRoute } from '#~/routes/pipelines/runs';
import useExperimentById from '#~/concepts/pipelines/apiHooks/useExperimentById';
import { getDashboardMainContainer } from '#~/utilities/utils';
import { ExperimentContext } from '#~/pages/pipelines/global/experiments/ExperimentContext';

type PipelineRunDetailsActionsProps = {
  run?: PipelineRunKF | null;
  onArchive: () => void;
  onDelete: () => void;
  isPipelineSupported: boolean;
};

const PipelineRunDetailsActions: React.FC<PipelineRunDetailsActionsProps> = ({
  onDelete,
  onArchive,
  run,
  isPipelineSupported,
}) => {
  const navigate = useNavigate();
  const { namespace, api, refreshAllAPI } = usePipelinesAPI();
  const notification = useNotification();
  const [open, setOpen] = React.useState(false);
  const isRunActive = run?.storage_state === StorageStateKF.AVAILABLE;
  const [experiment] = useExperimentById(run?.experiment_id);
  const isExperimentActive = experiment?.storage_state === StorageStateKF.AVAILABLE;
  const { experiment: contextExperiment } = React.useContext(ExperimentContext);

  if (!run) {
    return null;
  }

  return (
    <Dropdown
      onOpenChange={(isOpenChange) => setOpen(isOpenChange)}
      shouldFocusToggleOnSelect
      onSelect={() => setOpen(false)}
      toggle={(toggleRef) => (
        <MenuToggle
          data-testid="pipeline-run-details-actions"
          ref={toggleRef}
          variant="primary"
          aria-label="Actions"
          onClick={() => setOpen(!open)}
          isExpanded={open}
        >
          Actions
        </MenuToggle>
      )}
      isOpen={open}
      popperProps={{ position: 'right', appendTo: getDashboardMainContainer() }}
    >
      <DropdownList>
        {[
          ...(isPipelineSupported
            ? [
                <DropdownItem
                  key="retry-run"
                  isDisabled={run.state !== RuntimeStateKF.FAILED || !!run.error}
                  onClick={() =>
                    api
                      .retryPipelineRun({}, run.run_id)
                      .catch((e) => notification.error('Unable to retry pipeline run', e.message))
                  }
                >
                  Retry
                </DropdownItem>,
                <DropdownItem
                  key="duplicate-run"
                  onClick={() =>
                    navigate(
                      duplicateRunRoute(namespace, run.run_id, contextExperiment?.experiment_id),
                    )
                  }
                >
                  Duplicate
                </DropdownItem>,
                ...(isRunActive
                  ? [
                      <DropdownItem
                        key="stop-run"
                        isDisabled={run.state !== RuntimeStateKF.RUNNING}
                        onClick={() =>
                          api
                            .stopPipelineRun({}, run.run_id)
                            .catch((e) =>
                              notification.error('Unable to stop pipeline run', e.message),
                            )
                        }
                      >
                        Stop
                      </DropdownItem>,
                      <DropdownItem
                        key="compare-runs"
                        onClick={() =>
                          navigate(
                            compareRunsRoute(
                              namespace,
                              [run.run_id],
                              contextExperiment?.experiment_id,
                            ),
                          )
                        }
                      >
                        Compare runs
                      </DropdownItem>,
                    ]
                  : [
                      <DropdownItem
                        isAriaDisabled={!isExperimentActive}
                        key="restore-run"
                        onClick={() =>
                          api
                            .unarchivePipelineRun({}, run.run_id)
                            .catch((e) =>
                              notification.error('Unable to restore pipeline run', e.message),
                            )
                            .then(() => refreshAllAPI())
                        }
                        tooltipProps={
                          !isExperimentActive
                            ? {
                                position: 'left',
                                content:
                                  'Archived runs cannot be restored until its associated experiment is restored.',
                              }
                            : undefined
                        }
                      >
                        Restore
                      </DropdownItem>,
                    ]),
                <Divider key="separator" />,
              ]
            : []),
          !isRunActive ? (
            <DropdownItem key="delete-run" onClick={() => onDelete()}>
              Delete
            </DropdownItem>
          ) : (
            <DropdownItem key="archive-run" onClick={() => onArchive()}>
              Archive
            </DropdownItem>
          ),
        ]}
      </DropdownList>
    </Dropdown>
  );
};

export default PipelineRunDetailsActions;
