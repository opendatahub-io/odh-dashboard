import * as React from 'react';
import { Dropdown, DropdownItem, DropdownSeparator, DropdownToggle } from '@patternfly/react-core';

const PipelineDetailsActions: React.FC = () => {
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
        <DropdownItem key="create-run">Create run</DropdownItem>,
        <DropdownItem key="view-runs">View runs</DropdownItem>,
        <DropdownSeparator key="separator" />,
        <DropdownItem key="delete-pipeline">Delete pipeline</DropdownItem>,
      ]}
    />
  );
};

export default PipelineDetailsActions;
