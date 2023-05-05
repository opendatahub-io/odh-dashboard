import * as React from 'react';
import { Dropdown, DropdownItem, DropdownSeparator, DropdownToggle } from '@patternfly/react-core';
import { DeleteServerModal, ViewServerModal } from '~/concepts/pipelines/context';

const PipelinesPageHeaderActions: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [viewOpen, setViewOpen] = React.useState(false);

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
          <DropdownItem key="view-server-details" onClick={() => setViewOpen(true)}>
            View pipeline server configuration
          </DropdownItem>,
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
      <ViewServerModal isOpen={viewOpen} onClose={() => setViewOpen(false)} />
    </>
  );
};

export default PipelinesPageHeaderActions;
