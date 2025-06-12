import React from 'react';
import { TableBase } from '#~/components/table';
import { Identifier, IdentifierResourceType } from '#~/types';
import { nodeResourceColumns, DEFAULT_CPU_IDENTIFIER, DEFAULT_MEMORY_IDENTIFIER } from './const';
import NodeResourceTableRow from './NodeResourceTableRow';
import ManageNodeResourceModal from './ManageNodeResourceModal';
import DeleteNodeResourceModal from './DeleteNodeResourceModal';

type NodeResourceTableProps = {
  nodeResources: Identifier[];
  onUpdate?: (nodeResources: Identifier[]) => void;
};

const NodeResourceTable: React.FC<NodeResourceTableProps> = ({ nodeResources, onUpdate }) => {
  const viewOnly = !onUpdate;
  const [editIdentifier, setEditIdentifier] = React.useState<Identifier | undefined>();
  const [currentIndex, setCurrentIndex] = React.useState<number | undefined>();
  const [deleteIdentifier, setDeleteIdentifier] = React.useState<Identifier | undefined>();

  const wouldRemoveLastCPUorMemory = (identifier: Identifier, resources: Identifier[]): boolean => {
    const isCPU =
      identifier.resourceType === IdentifierResourceType.CPU ||
      identifier.identifier === DEFAULT_CPU_IDENTIFIER;
    const isMemory =
      identifier.resourceType === IdentifierResourceType.MEMORY ||
      identifier.identifier === DEFAULT_MEMORY_IDENTIFIER;

    // if it's not cpu or memory, guard not applicable, can just remove it
    if (!(isCPU || isMemory)) {
      return false;
    }

    const remainingResources = resources.filter((r) => r !== identifier);
    if (isCPU) {
      return !remainingResources.some(
        (r) =>
          r.resourceType === IdentifierResourceType.CPU || r.identifier === DEFAULT_CPU_IDENTIFIER,
      );
    }
    // has to be memory; all that is left
    return !remainingResources.some(
      (r) =>
        r.resourceType === IdentifierResourceType.MEMORY ||
        r.identifier === DEFAULT_MEMORY_IDENTIFIER,
    );
  };

  const handleDelete = (rowIndex: number) => {
    const identifierToDelete = nodeResources[rowIndex];

    if (wouldRemoveLastCPUorMemory(identifierToDelete, nodeResources)) {
      setDeleteIdentifier(identifierToDelete);
    } else {
      // If not CPU/memory or not the last one, proceed with delete
      const updatedIdentifiers = [...nodeResources];
      updatedIdentifiers.splice(rowIndex, 1);
      onUpdate?.(updatedIdentifiers);
    }
  };

  const handleDeleteConfirm = (shouldDoDeletion: boolean) => {
    if (shouldDoDeletion && deleteIdentifier) {
      const updatedIdentifiers = nodeResources.filter((r) => r !== deleteIdentifier);
      onUpdate?.(updatedIdentifiers);
    }
    setDeleteIdentifier(undefined);
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
      {deleteIdentifier && (
        <DeleteNodeResourceModal identifier={deleteIdentifier} onClose={handleDeleteConfirm} />
      )}
    </>
  );
};

export default NodeResourceTable;
