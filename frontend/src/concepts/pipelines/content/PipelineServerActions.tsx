import * as React from 'react';
import { Tooltip } from '@patternfly/react-core';
import {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
  DropdownToggle,
  KebabToggle,
} from '@patternfly/react-core/deprecated';
import { DeleteServerModal, ViewServerModal, usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineAndVersionContext } from '~/concepts/pipelines/content/PipelineAndVersionContext';
import DeletePipelinesModal from '~/concepts/pipelines/content/DeletePipelinesModal';

type PipelineServerActionsProps = {
  variant?: 'kebab' | 'dropdown';
  isDisabled: boolean;
};

const PipelineServerActions: React.FC<PipelineServerActionsProps> = ({ variant, isDisabled }) => {
  const [open, setOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [viewOpen, setViewOpen] = React.useState(false);
  const { refreshAllAPI } = usePipelinesAPI();
  const { getResourcesForDeletion, clearAfterDeletion } =
    React.useContext(PipelineAndVersionContext);
  const { pipelines, versions } = getResourcesForDeletion();
  const [deletePipelinesOpen, setDeletePipelinesOpen] = React.useState(false);

  const DropdownComponent = (
    <Dropdown
      data-testid="pipeline-server-action"
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
        ...(variant === 'kebab'
          ? [
              <DropdownItem
                key="delete"
                onClick={() => setDeletePipelinesOpen(true)}
                isDisabled={pipelines.length === 0 && versions.length === 0}
              >
                Delete
              </DropdownItem>,
            ]
          : []),
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
      <DeletePipelinesModal
        isOpen={deletePipelinesOpen}
        toDeletePipelines={pipelines}
        toDeletePipelineVersions={versions}
        onClose={(deleted) => {
          if (deleted) {
            refreshAllAPI();
            clearAfterDeletion();
          }
          setDeletePipelinesOpen(false);
        }}
      />
    </>
  );
};

export default PipelineServerActions;
