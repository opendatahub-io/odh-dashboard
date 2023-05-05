import * as React from 'react';
import { Dropdown, DropdownItem, DropdownSeparator, DropdownToggle } from '@patternfly/react-core';
import { DeleteServerModal } from '~/concepts/pipelines/context';

const PipelinesPageHeaderActions: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  return (
    <>
      <Dropdown
        removeFindDomNode
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
          <DropdownItem
            onClick={() => {
              setDeleteOpen(true);
            }}
            key="delete-server"
          >
            Delete pipeline server
          </DropdownItem>,
        ]}
      />
      <DeleteServerModal
        isOpen={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
        }}
      />
    </>
  );
};

export default PipelinesPageHeaderActions;
