import * as React from 'react';
import { Dropdown, DropdownItem, DropdownSeparator, DropdownToggle } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { usePipelinesAPI } from '~/concepts/pipelines/context';

type PipelineDetailsActionsProps = {
  onDelete: () => void;
};

const PipelineDetailsActions: React.FC<PipelineDetailsActionsProps> = ({ onDelete }) => {
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
      dropdownItems={[
        <DropdownItem
          key="create-run"
          onClick={() => alert('should take you to the create run page')}
        >
          Create run
        </DropdownItem>,
        <DropdownItem key="view-runs" onClick={() => navigate(`/pipelineRuns/${namespace}`)}>
          View runs
        </DropdownItem>,
        <DropdownSeparator key="separator" />,
        <DropdownItem key="delete-pipeline" onClick={() => onDelete()}>
          Delete pipeline
        </DropdownItem>,
      ]}
    />
  );
};

export default PipelineDetailsActions;
