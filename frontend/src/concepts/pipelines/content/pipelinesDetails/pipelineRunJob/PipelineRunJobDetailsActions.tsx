import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
  DropdownToggle,
} from '@patternfly/react-core/deprecated';
import { Spinner } from '@patternfly/react-core';

import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineRunJobKFv2, RecurringRunStatus } from '~/concepts/pipelines/kfTypes';
import { cloneScheduleRoute } from '~/routes';
import { PipelineRunSearchParam } from '~/concepts/pipelines/content/types';
import { PipelineRunType } from '~/pages/pipelines/global/runs';
import { useIsAreaAvailable, SupportedArea } from '~/concepts/areas';

type PipelineRunJobDetailsActionsProps = {
  job?: PipelineRunJobKFv2;
  onDelete: () => void;
};

const PipelineRunJobDetailsActions: React.FC<PipelineRunJobDetailsActionsProps> = ({
  onDelete,
  job,
}) => {
  const navigate = useNavigate();
  const { experimentId } = useParams();
  const { namespace, api, refreshAllAPI } = usePipelinesAPI();
  const isExperimentsAvailable = useIsAreaAvailable(SupportedArea.PIPELINE_EXPERIMENTS).status;
  const [open, setOpen] = React.useState(false);
  const [isEnabled, setIsEnabled] = React.useState(job?.status === RecurringRunStatus.ENABLED);
  const [isStatusUpdating, setIsStatusUpdating] = React.useState(false);

  const updateStatus = React.useCallback(async () => {
    if (job?.recurring_run_id) {
      try {
        setIsStatusUpdating(true);

        await api.updatePipelineRunJob({}, job.recurring_run_id, !isEnabled);

        refreshAllAPI();
        setIsEnabled((prevValue) => !prevValue);
        setIsStatusUpdating(false);
      } catch (e) {
        setIsStatusUpdating(false);
      }
    }
  }, [api, isEnabled, job?.recurring_run_id, refreshAllAPI]);

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
      data-testid="pipeline-run-job-details-actions"
      onSelect={() => setOpen(false)}
      toggle={
        <DropdownToggle toggleVariant="primary" onToggle={() => setOpen(!open)}>
          Actions
        </DropdownToggle>
      }
      isOpen={open}
      position="right"
      dropdownItems={
        !job
          ? []
          : [
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
                  navigate({
                    pathname: cloneScheduleRoute(
                      namespace,
                      job.recurring_run_id,
                      isExperimentsAvailable ? experimentId : undefined,
                    ),
                    search: `?${PipelineRunSearchParam.RunType}=${PipelineRunType.SCHEDULED}`,
                  })
                }
              >
                Duplicate
              </DropdownItem>,
              <DropdownSeparator key="separator" />,
              <DropdownItem key="delete-run" onClick={() => onDelete()}>
                Delete
              </DropdownItem>,
            ]
      }
    />
  );
};

export default PipelineRunJobDetailsActions;
