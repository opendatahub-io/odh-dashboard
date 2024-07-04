import * as React from 'react';
import { Divider, Dropdown, DropdownItem, DropdownList, MenuToggle } from '@patternfly/react-core';
import { useNavigate, useParams } from 'react-router-dom';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineRecurringRunKFv2 } from '~/concepts/pipelines/kfTypes';
import { cloneScheduleRoute } from '~/routes';
import { PipelineRunSearchParam } from '~/concepts/pipelines/content/types';
import { PipelineRunType } from '~/pages/pipelines/global/runs';
import { useIsAreaAvailable, SupportedArea } from '~/concepts/areas';
import { getDashboardMainContainer } from '~/utilities/utils';

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
  const { experimentId } = useParams();
  const isExperimentsAvailable = useIsAreaAvailable(SupportedArea.PIPELINE_EXPERIMENTS).status;

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
              <DropdownItem
                key="clone-run"
                onClick={() =>
                  navigate({
                    pathname: cloneScheduleRoute(
                      namespace,
                      recurringRun.recurring_run_id,
                      isExperimentsAvailable ? experimentId : undefined,
                    ),
                    search: `?${PipelineRunSearchParam.RunType}=${PipelineRunType.SCHEDULED}`,
                  })
                }
              >
                Duplicate
              </DropdownItem>,
              <Divider key="separator" />,
              <DropdownItem key="delete-run" onClick={() => onDelete()}>
                Delete
              </DropdownItem>,
            ]}
      </DropdownList>
    </Dropdown>
  );
};

export default PipelineRecurringRunDetailsActions;
