import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  Divider,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  Spinner,
} from '@patternfly/react-core';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineRecurringRunKFv2, RecurringRunStatus } from '~/concepts/pipelines/kfTypes';
import { cloneRecurringRunRoute } from '~/routes';
import { useIsAreaAvailable, SupportedArea } from '~/concepts/areas';
import { getDashboardMainContainer } from '~/utilities/utils';

type PipelineRecurringRunDetailsActionsProps = {
  recurringRun?: PipelineRecurringRunKFv2;
  onDelete: () => void;
  isPipelineSupported: boolean;
};

const PipelineRecurringRunDetailsActions: React.FC<PipelineRecurringRunDetailsActionsProps> = ({
  onDelete,
  recurringRun,
  isPipelineSupported,
}) => {
  const navigate = useNavigate();
  const { experimentId, pipelineId, pipelineVersionId } = useParams();
  const { namespace, api, refreshAllAPI } = usePipelinesAPI();
  const isExperimentsAvailable = useIsAreaAvailable(SupportedArea.PIPELINE_EXPERIMENTS).status;
  const [open, setOpen] = React.useState(false);
  const [isEnabled, setIsEnabled] = React.useState(
    recurringRun?.status === RecurringRunStatus.ENABLED,
  );
  const [isStatusUpdating, setIsStatusUpdating] = React.useState(false);

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
                      isAriaDisabled={isStatusUpdating}
                      {...(isStatusUpdating && {
                        icon: <Spinner isInline />,
                        tooltip: 'Updating status...',
                      })}
                    >
                      {updateStatusActionLabel}
                    </DropdownItem>,
                    <DropdownItem
                      key="clone-run"
                      onClick={() =>
                        navigate(
                          cloneRecurringRunRoute(
                            namespace,
                            recurringRun.recurring_run_id,
                            isExperimentsAvailable ? experimentId : undefined,
                            pipelineId,
                            pipelineVersionId,
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
