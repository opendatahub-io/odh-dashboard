import * as React from 'react';
import {
  Divider,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  Tooltip,
} from '@patternfly/react-core';
import { EllipsisVIcon } from '@patternfly/react-icons';
import { DeleteServerModal, usePipelinesAPI, ViewServerModal } from '#~/concepts/pipelines/context';
import { PipelineAndVersionContext } from '#~/concepts/pipelines/content/PipelineAndVersionContext';
import DeletePipelinesModal from '#~/concepts/pipelines/content/DeletePipelinesModal';
import { getDashboardMainContainer } from '#~/utilities/utils';
import { fireSimpleTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';

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
  const { pipelinesServer } = usePipelinesAPI();
  const DropdownComponent = (
    <Dropdown
      onOpenChange={(isOpened) => setOpen(isOpened)}
      onSelect={() => setOpen(false)}
      toggle={(toggleRef) =>
        variant === 'kebab' ? (
          <MenuToggle
            data-testid="pipeline-server-action"
            aria-label="Pipeline server action kebab toggle"
            variant="plain"
            ref={toggleRef}
            onClick={() => setOpen(!open)}
            isExpanded={open}
            isDisabled={isDisabled}
          >
            <EllipsisVIcon />
          </MenuToggle>
        ) : (
          <MenuToggle
            aria-label="Actions"
            data-testid="pipeline-server-action"
            variant="secondary"
            ref={toggleRef}
            isDisabled={isDisabled}
            onClick={() => {
              setOpen(!open);
            }}
          >
            Pipeline server actions
          </MenuToggle>
        )
      }
      isOpen={open}
      popperProps={{ position: 'right', appendTo: getDashboardMainContainer() }}
    >
      <DropdownList>
        {[
          <DropdownItem
            key="view-server-details"
            onClick={() => {
              setViewOpen(true);
              fireSimpleTrackingEvent('Pipeline Server Config Viewed');
            }}
          >
            View pipeline server configuration
          </DropdownItem>,
          ...(pipelinesServer.compatible
            ? [
                <Divider key="separator" />,
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
              ]
            : []),
        ]}
      </DropdownList>
    </Dropdown>
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
      {deleteOpen ? (
        <DeleteServerModal
          onClose={() => {
            setDeleteOpen(false);
          }}
        />
      ) : null}
      {viewOpen ? <ViewServerModal onClose={() => setViewOpen(false)} /> : null}
      {deletePipelinesOpen ? (
        <DeletePipelinesModal
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
      ) : null}
    </>
  );
};

export default PipelineServerActions;
