import * as React from 'react';
import {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
  DropdownToggle,
} from '@patternfly/react-core/deprecated';
import { useNavigate, useParams } from 'react-router-dom';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import useNotification from '~/utilities/useNotification';
import { PipelineRunKFv2, RuntimeStateKF } from '~/concepts/pipelines/kfTypes';
import { cloneRunRoute } from '~/routes';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';

type PipelineRunDetailsActionsProps = {
  run?: PipelineRunKFv2 | null;
  onDelete: () => void;
};

const PipelineRunDetailsActions: React.FC<PipelineRunDetailsActionsProps> = ({ onDelete, run }) => {
  const navigate = useNavigate();
  const { experimentId } = useParams();
  const { namespace, api } = usePipelinesAPI();
  const notification = useNotification();
  const [open, setOpen] = React.useState(false);
  const isExperimentsAvailable = useIsAreaAvailable(SupportedArea.PIPELINE_EXPERIMENTS).status;

  return (
    <Dropdown
      data-testid="pipeline-run-details-actions"
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
                isDisabled={run.state !== RuntimeStateKF.RUNNING}
                onClick={() =>
                  api
                    .stopPipelineRun({}, run.run_id)
                    .catch((e) => notification.error('Unable to stop pipeline run', e.message))
                }
              >
                Stop
              </DropdownItem>,
              <DropdownItem
                key="clone-run"
                onClick={() =>
                  navigate(
                    cloneRunRoute(
                      namespace,
                      run.run_id,
                      isExperimentsAvailable ? experimentId : undefined,
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

export default PipelineRunDetailsActions;
