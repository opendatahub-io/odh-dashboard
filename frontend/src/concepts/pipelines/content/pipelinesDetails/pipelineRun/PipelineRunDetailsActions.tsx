import * as React from 'react';
import {
  Tooltip,
  Divider,
  Dropdown,
  DropdownItem,
  MenuToggle,
  DropdownList,
} from '@patternfly/react-core';

import { useNavigate, useParams } from 'react-router-dom';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import useNotification from '~/utilities/useNotification';
import { PipelineRunKFv2, RuntimeStateKF, StorageStateKF } from '~/concepts/pipelines/kfTypes';
import { cloneRunRoute, experimentsCompareRunsRoute } from '~/routes';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import useExperimentById from '~/concepts/pipelines/apiHooks/useExperimentById';
import { getDashboardMainContainer } from '~/utilities/utils';

type PipelineRunDetailsActionsProps = {
  run?: PipelineRunKFv2 | null;
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
  const isExperimentsAvailable = useIsAreaAvailable(SupportedArea.PIPELINE_EXPERIMENTS).status;
  const isRunActive = run?.storage_state === StorageStateKF.AVAILABLE;
  const [experiment] = useExperimentById(run?.experiment_id);
  const isExperimentActive = experiment?.storage_state === StorageStateKF.AVAILABLE;
  const { experimentId, pipelineId, pipelineVersionId } = useParams();

  const RestoreDropdownItem = (
    <DropdownItem
      isDisabled={!isExperimentActive}
      key="restore-run"
      onClick={() =>
        run &&
        api
          .unarchivePipelineRun({}, run.run_id)
          .catch((e) => notification.error('Unable to restore pipeline run', e.message))
          .then(() => refreshAllAPI())
      }
    >
      Restore
    </DropdownItem>
  );

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
        {!run
          ? []
          : [
              ...(isPipelineSupported
                ? [
                    <DropdownItem
                      key="retry-run"
                      isDisabled={run.state !== RuntimeStateKF.FAILED || !!run.error}
                      onClick={() =>
                        api
                          .retryPipelineRun({}, run.run_id)
                          .catch((e) =>
                            notification.error('Unable to retry pipeline run', e.message),
                          )
                      }
                    >
                      Retry
                    </DropdownItem>,
                    <DropdownItem
                      key="clone-run"
                      onClick={() =>
                        navigate(
                          cloneRunRoute(
                            namespace,
                            run.run_id,
                            isExperimentsAvailable ? experimentId : undefined,
                            pipelineId,
                            pipelineVersionId,
                          ),
                        )
                      }
                    >
                      Duplicate
                    </DropdownItem>,
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
                    isExperimentsAvailable && experimentId && isRunActive ? (
                      <DropdownItem
                        key="compare-runs"
                        onClick={() =>
                          navigate(
                            experimentsCompareRunsRoute(namespace, run.experiment_id, [run.run_id]),
                          )
                        }
                      >
                        Compare runs
                      </DropdownItem>
                    ) : (
                      <React.Fragment key="compare-runs" />
                    ),
                    !isRunActive ? (
                      !isExperimentActive ? (
                        <Tooltip
                          position="left"
                          content={
                            <div>
                              Archived runs cannot be restored until its associated experiment is
                              restored.
                            </div>
                          }
                        >
                          {RestoreDropdownItem}
                        </Tooltip>
                      ) : (
                        RestoreDropdownItem
                      )
                    ) : (
                      <React.Fragment key="restore-run" />
                    ),
                    <Divider key="separator" />,
                  ]
                : []),
              !isRunActive ? (
                <React.Fragment key="delete-run">
                  <DropdownItem onClick={() => onDelete()}>Delete</DropdownItem>
                </React.Fragment>
              ) : (
                <React.Fragment key="archive-run">
                  <DropdownItem onClick={() => onArchive()}>Archive</DropdownItem>
                </React.Fragment>
              ),
            ]}
      </DropdownList>
    </Dropdown>
  );
};

export default PipelineRunDetailsActions;
