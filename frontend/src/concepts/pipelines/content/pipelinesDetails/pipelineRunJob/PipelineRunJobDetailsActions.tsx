import * as React from 'react';
import {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
  DropdownToggle,
} from '@patternfly/react-core/deprecated';
import { useNavigate, useParams } from 'react-router-dom';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineRunJobKFv2 } from '~/concepts/pipelines/kfTypes';
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
  const { namespace } = usePipelinesAPI();
  const [open, setOpen] = React.useState(false);
  const { experimentId } = useParams();
  const isExperimentsAvailable = useIsAreaAvailable(SupportedArea.PIPELINE_EXPERIMENTS).status;

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
