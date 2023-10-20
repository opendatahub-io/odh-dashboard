import * as React from 'react';
import { Dropdown, DropdownItem, DropdownSeparator, DropdownToggle } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineRunJobKF } from '~/concepts/pipelines/kfTypes';

type PipelineRunJobDetailsActionsProps = {
  job?: PipelineRunJobKF;
  onDelete: () => void;
};

const PipelineRunJobDetailsActions: React.FC<PipelineRunJobDetailsActionsProps> = ({
  onDelete,
  job,
}) => {
  const navigate = useNavigate();
  const { namespace } = usePipelinesAPI();
  const [open, setOpen] = React.useState(false);

  return (
    <Dropdown
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
                  navigate(`/pipelineRuns/${namespace}/pipelineRun/cloneJob/${job.id}`)
                }
              >
                Duplicate run
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
