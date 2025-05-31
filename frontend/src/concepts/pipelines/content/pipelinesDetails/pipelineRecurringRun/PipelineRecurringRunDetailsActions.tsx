import React from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Divider,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  Spinner,
} from '@patternfly/react-core';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import {
  PipelineRecurringRunKF,
  RecurringRunStatus,
  StorageStateKF,
} from '#~/concepts/pipelines/kfTypes';
import { duplicateRecurringRunRoute } from '#~/routes/pipelines/runs';
import { getDashboardMainContainer } from '#~/utilities/utils';
import { ExperimentContext } from '#~/pages/pipelines/global/experiments/ExperimentContext';
import useExperimentById from '#~/concepts/pipelines/apiHooks/useExperimentById';

type PipelineRecurringRunDetailsActionsProps = {
  recurringRun?: PipelineRecurringRunKF;
  onDelete: () => void;
  isPipelineSupported: boolean;
};

const PipelineRecurringRunDetailsActions: React.FC<PipelineRecurringRunDetailsActionsProps> = ({
  onDelete,
  recurringRun,
  isPipelineSupported,
}) => {
  const navigate = useNavigate();
  const { namespace, api, refreshAllAPI } = usePipelinesAPI();
  const [open, setOpen] = React.useState(false);
  const [isEnabled, setIsEnabled] = React.useState(
    recurringRun?.status === RecurringRunStatus.ENABLED,
  );
  const [isStatusUpdating, setIsStatusUpdating] = React.useState(false);
  const [experiment] = useExperimentById(recurringRun?.experiment_id);
  const isExperimentActive = experiment?.storage_state === StorageStateKF.AVAILABLE;
  const { experiment: contextExperiment } = React.useContext(ExperimentContext);

  const updateStatus = React.useCallback(async () => {
    if (recurringRun?.recurring_run_id) {
      try {
        setIsStatusUpdating(true);

        await api.updatePipelineRecurringRun({}, recurringRun.recurring_run_id, !isEnabled);

        refreshAllAPI();
        setIsEnabled((prevValue) => !prevValue);
        setIsStatusUpdating(false);
      } catch (e) {
        setIsStatusUpdating(false);
      }
    }
  }, [api, isEnabled, recurringRun?.recurring_run_id, refreshAllAPI]);

  const updateStatusActionLabel = React.useMemo(() => {
    if (isStatusUpdating) {
      if (isEnabled) {
        return 'Disabling...';
      }

      return 'Enabling...';
    }

    if (isEnabled) {
      return 'Disable';
    }

    return 'Enable';
  }, [isEnabled, isStatusUpdating]);

  return (
    <Dropdown
      onSelect={() => setOpen(false)}
      onOpenChange={(isOpenChange) => setOpen(isOpenChange)}
      shouldFocusToggleOnSelect
      toggle={(toggleRef) => (
        <MenuToggle
          ref={toggleRef}
          data-testid="pipeline-recurring-run-details-actions"
          aria-label="Actions"
          variant="primary"
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
        {!recurringRun
          ? []
          : [
              ...(isPipelineSupported
                ? [
                    <DropdownItem
                      key="update-schedule-status"
                      onClick={updateStatus}
                      isAriaDisabled={isStatusUpdating || !isExperimentActive}
                      {...(isStatusUpdating && {
                        icon: <Spinner isInline />,
                        tooltip: 'Updating status...',
                      })}
                    >
                      {updateStatusActionLabel}
                    </DropdownItem>,
                    <DropdownItem
                      key="duplicate-run"
                      onClick={() =>
                        navigate(
                          duplicateRecurringRunRoute(
                            namespace,
                            recurringRun.recurring_run_id,
                            contextExperiment?.experiment_id,
                          ),
                        )
                      }
                    >
                      Duplicate
                    </DropdownItem>,
                    <Divider key="separator" />,
                  ]
                : []),
              <DropdownItem key="delete-run" onClick={() => onDelete()}>
                Delete
              </DropdownItem>,
            ]}
      </DropdownList>
    </Dropdown>
  );
};

export default PipelineRecurringRunDetailsActions;
