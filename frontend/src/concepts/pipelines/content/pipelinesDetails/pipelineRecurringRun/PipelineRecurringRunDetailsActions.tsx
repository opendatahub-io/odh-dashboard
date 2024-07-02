import * as React from 'react';
import {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
  DropdownToggle,
} from '@patternfly/react-core/deprecated';
import { useNavigate, useParams } from 'react-router-dom';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineRecurringRunKFv2 } from '~/concepts/pipelines/kfTypes';
import { cloneRecurringRunRoute } from '~/routes';
import { useIsAreaAvailable, SupportedArea } from '~/concepts/areas';

type PipelineRecurringRunDetailsActionsProps = {
  recurringRun?: PipelineRecurringRunKFv2;
  onDelete: () => void;
};

const PipelineRecurringRunDetailsActions: React.FC<PipelineRecurringRunDetailsActionsProps> = ({
  onDelete,
  recurringRun,
}) => {
  const navigate = useNavigate();
  const { namespace } = usePipelinesAPI();
  const [open, setOpen] = React.useState(false);
  const { experimentId, pipelineId, pipelineVersionId } = useParams();
  const isExperimentsAvailable = useIsAreaAvailable(SupportedArea.PIPELINE_EXPERIMENTS).status;

  return (
    <Dropdown
      data-testid="pipeline-recurring-run-details-actions"
      onSelect={() => setOpen(false)}
      toggle={
        <DropdownToggle toggleVariant="primary" onToggle={() => setOpen(!open)}>
          Actions
        </DropdownToggle>
      }
      isOpen={open}
      position="right"
      dropdownItems={
        !recurringRun
          ? []
          : [
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
              <DropdownSeparator key="separator" />,
              <DropdownItem key="delete-run" onClick={() => onDelete()}>
                Delete
              </DropdownItem>,
            ]
      }
    />
  );
};

export default PipelineRecurringRunDetailsActions;
