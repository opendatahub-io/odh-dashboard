import * as React from 'react';
import { Dropdown, DropdownItem, DropdownSeparator, DropdownToggle } from '@patternfly/react-core';

const PipelinesPageHeaderActions: React.FC = () => {
  const [open, setOpen] = React.useState(false);

  return (
    <Dropdown
      onSelect={() => setOpen(false)}
      toggle={
        <DropdownToggle toggleVariant="secondary" onToggle={() => setOpen(!open)}>
          Pipeline server actions
        </DropdownToggle>
      }
      isOpen={open}
      position="right"
      dropdownItems={[
        <DropdownItem key="view-server-details">View pipeline server configuration</DropdownItem>,
        <DropdownSeparator key="separator" />,
        <DropdownItem key="delete-server">Delete pipeline server</DropdownItem>,
      ]}
    />
  );
};

export default PipelinesPageHeaderActions;
