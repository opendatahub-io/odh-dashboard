import * as React from 'react';
import { Dropdown, DropdownItem, DropdownSeparator, DropdownToggle } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import useNotification from '~/utilities/useNotification';
import { PipelineRunKF, PipelineRunStatusesKF } from '~/concepts/pipelines/kfTypes';

type PipelineDetailsActionsProps = {
  run?: PipelineRunKF;
  onDelete: () => void;
};

const PipelineRunDetailsActions: React.FC<PipelineDetailsActionsProps> = ({ onDelete, run }) => {
  const navigate = useNavigate();
  const { namespace, api } = usePipelinesAPI();
  const notification = useNotification();
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
        !run
          ? []
          : [
              <DropdownItem
                key="stop-run"
                isDisabled={run.status !== PipelineRunStatusesKF.RUNNING}
                onClick={() =>
                  api
                    .stopPipelineRun({}, run.id)
                    .catch((e) => notification.error('Unable to stop pipeline run', e.message))
                }
              >
                Stop run
              </DropdownItem>,
              <DropdownItem
                key="clone-run"
                onClick={() => navigate(`/pipelineRuns/${namespace}/pipelineRun/clone/${run.id}`)}
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

export default PipelineRunDetailsActions;
