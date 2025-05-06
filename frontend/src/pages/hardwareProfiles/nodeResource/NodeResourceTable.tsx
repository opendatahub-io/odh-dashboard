import React from 'react';
import { Alert, Button, Modal, ModalVariant } from '@patternfly/react-core';
import { TableBase } from '~/components/table';
import { Identifier, IdentifierResourceType } from '~/types';
import { hasCPUandMemory } from '~/pages/hardwareProfiles/manage/ManageNodeResourceSection';
import { nodeResourceColumns, DEFAULT_CPU_IDENTIFIER, DEFAULT_MEMORY_IDENTIFIER } from './const';
import NodeResourceTableRow from './NodeResourceTableRow';
import ManageNodeResourceModal from './ManageNodeResourceModal';

type NodeResourceTableProps = {
  nodeResources: Identifier[];
  onUpdate?: (nodeResources: Identifier[]) => void;
};

const NodeResourceTable: React.FC<NodeResourceTableProps> = ({ nodeResources, onUpdate }) => {
  const viewOnly = !onUpdate;
  const [editIdentifier, setEditIdentifier] = React.useState<Identifier | undefined>();
  const [currentIndex, setCurrentIndex] = React.useState<number | undefined>();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [pendingDeleteIndex, setPendingDeleteIndex] = React.useState<number | undefined>();

  const isCPUorMemory = (identifier: Identifier): boolean =>
    identifier.resourceType === IdentifierResourceType.CPU ||
    identifier.identifier === DEFAULT_CPU_IDENTIFIER ||
    identifier.resourceType === IdentifierResourceType.MEMORY ||
    identifier.identifier === DEFAULT_MEMORY_IDENTIFIER;

  const wouldRemoveLastCPUorMemory = (identifier: Identifier, resources: Identifier[]): boolean => {
    const isCPU =
      identifier.resourceType === IdentifierResourceType.CPU ||
      identifier.identifier === DEFAULT_CPU_IDENTIFIER;
    const isMemory =
      identifier.resourceType === IdentifierResourceType.MEMORY ||
      identifier.identifier === DEFAULT_MEMORY_IDENTIFIER;

    if (!isCPU && !isMemory) {
      return false;
    }

    const remainingResources = resources.filter((r) => r !== identifier);
    if (isCPU) {
      return !remainingResources.some(
        (r) =>
          r.resourceType === IdentifierResourceType.CPU || r.identifier === DEFAULT_CPU_IDENTIFIER,
      );
    }
    if (isMemory) {
      return !remainingResources.some(
        (r) =>
          r.resourceType === IdentifierResourceType.MEMORY ||
          r.identifier === DEFAULT_MEMORY_IDENTIFIER,
      );
    }
    return false;
  };

  const handleDelete = (rowIndex: number) => {
    console.log('handleDelete', rowIndex);
    const identifierToDelete = nodeResources[rowIndex];

    if (wouldRemoveLastCPUorMemory(identifierToDelete, nodeResources)) {
      setPendingDeleteIndex(rowIndex);
      setDeleteConfirmOpen(true);
      return;
    }

    // If not CPU/memory or not the last one, proceed with delete
    const updatedIdentifiers = [...nodeResources];
    updatedIdentifiers.splice(rowIndex, 1);
    onUpdate?.(updatedIdentifiers);
  };

  const confirmDelete = () => {
    if (pendingDeleteIndex !== undefined) {
      const updatedIdentifiers = [...nodeResources];
      updatedIdentifiers.splice(pendingDeleteIndex, 1);
      onUpdate?.(updatedIdentifiers);
    }
    setDeleteConfirmOpen(false);
    setPendingDeleteIndex(undefined);
  };

  return (
    <>
      <TableBase
        variant="compact"
        data-testid="hardware-profile-node-resources-table"
        id="hardware-profile-node-resources-table"
        data={nodeResources}
        columns={
          viewOnly
            ? nodeResourceColumns.filter((column) => column.field !== 'kebab')
            : nodeResourceColumns
        }
        rowRenderer={(identifier, rowIndex) => (
          <NodeResourceTableRow
            key={rowIndex}
            identifier={identifier}
            onEdit={(newIdentifier) => {
              setEditIdentifier(newIdentifier);
              setCurrentIndex(rowIndex);
            }}
            onDelete={() => handleDelete(rowIndex)}
            showActions={!viewOnly}
          />
        )}
      />
      {editIdentifier ? (
        <ManageNodeResourceModal
          existingIdentifier={editIdentifier}
          onClose={() => {
            setEditIdentifier(undefined);
            setCurrentIndex(undefined);
          }}
          onSave={(identifier) => {
            if (currentIndex !== undefined) {
              const updatedIdentifiers = [...nodeResources];
              updatedIdentifiers[currentIndex] = identifier;
              onUpdate?.(updatedIdentifiers);
            }
          }}
          nodeResources={nodeResources}
        />
      ) : null}
      {deleteConfirmOpen && (
        <>
          <div>hi there delete would be open here</div>
          <Modal
            variant={ModalVariant.small}
            title="Remove resource"
            onClose={() => {
              setDeleteConfirmOpen(false);
              setPendingDeleteIndex(undefined);
            }}
          >
            <Alert variant="warning" isInline title="Removing the last CPU or Memory resource">
              It is not recommended to remove the last CPU or Memory resource. Resources that use
              this hardware profile will schedule, but will be very unstable due to not having any
              lower or upper resource bounds.
            </Alert>
            <div className="pf-v6-u-mt-md">
              <Button variant="danger" onClick={confirmDelete}>
                Remove
              </Button>
              <Button
                variant="link"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setPendingDeleteIndex(undefined);
                }}
                className="pf-v6-u-ml-sm"
              >
                Cancel
              </Button>
            </div>
          </Modal>
        </>
      )}
    </>
  );
};

export default NodeResourceTable;
