import * as React from 'react';
import {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
  DropdownToggle,
  KebabToggle,
  Tooltip,
} from '@patternfly/react-core';
import { DeleteServerModal, ViewServerModal } from '~/concepts/pipelines/context';

type PipelineServerActionsProps = {
  variant?: 'kebab' | 'dropdown';
  isDisabled: boolean;
};

const PipelineServerActions: React.FC<PipelineServerActionsProps> = ({ variant, isDisabled }) => {
  const [open, setOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [viewOpen, setViewOpen] = React.useState(false);

  const DropdownComponent = (
    <Dropdown
      removeFindDomNode
      onSelect={() => setOpen(false)}
      toggle={
        variant === 'kebab' ? (
          <KebabToggle isDisabled={isDisabled} onToggle={() => setOpen(!open)} />
        ) : (
          <DropdownToggle
            toggleVariant="secondary"
            isDisabled={isDisabled}
            onToggle={() => setOpen(!open)}
          >
            Pipeline server actions
          </DropdownToggle>
        )
      }
      isOpen={open}
      position="right"
      isPlain={variant === 'kebab'}
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
  );

  if (isDisabled) {
    return (
      <Tooltip
        content="To access pipeline server actions, first create a pipeline server."
        position="right"
      >
        {DropdownComponent}
      </Tooltip>
    );
  }

  return (
    <>
      {DropdownComponent}
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

export default PipelineServerActions;
