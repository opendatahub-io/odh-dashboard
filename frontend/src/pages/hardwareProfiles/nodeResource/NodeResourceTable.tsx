import React from 'react';
import { TableBase } from '~/components/table';
import { Identifier } from '~/types';
import { nodeResourceColumns } from './const';
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
            onDelete={() => {
              const updatedIdentifiers = [...nodeResources];
              updatedIdentifiers.splice(rowIndex, 1);
              onUpdate?.(updatedIdentifiers);
            }}
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
    </>
  );
};

export default NodeResourceTable;
