import { EmptyState, EmptyStateBody, Title } from '@patternfly/react-core';
import React from 'react';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { Table } from '~/components/table';
import { Identifier } from '~/types';
import { nodeResourceColumns } from './const';
import NodeResourceTableRow from './NodeResourceTableRow';
import ManageNodeResourceModal from './ManageNodeResourceModal';

type NodeResourceTableProps = {
  identifiers: Identifier[];
  onUpdate: (identifiers: Identifier[]) => void;
};

const NodeResourceTable: React.FC<NodeResourceTableProps> = ({ identifiers, onUpdate }) => {
  const [editIdentifier, setEditIdentifier] = React.useState<Identifier | undefined>();
  const [currentIndex, setCurrentIndex] = React.useState<number | undefined>();

  if (identifiers.length === 0) {
    return (
      <EmptyState
        titleText={
          <Title headingLevel="h2" size="lg">
            No node resource
          </Title>
        }
        icon={PlusCircleIcon}
        variant="xs"
        data-testid="node-resource-empty-state"
      >
        <EmptyStateBody>No node resource body</EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <>
      <Table
        data={identifiers}
        columns={nodeResourceColumns}
        data-testid="node-resource-table"
        rowRenderer={(identifier, rowIndex) => (
          <NodeResourceTableRow
            key={identifier.identifier + rowIndex}
            identifier={identifier}
            onEdit={(newIdentifier) => {
              setEditIdentifier(newIdentifier);
              setCurrentIndex(rowIndex);
            }}
            onDelete={() => {
              const updatedIdentifiers = [...identifiers];
              updatedIdentifiers.splice(rowIndex, 1);
              onUpdate(updatedIdentifiers);
            }}
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
              const updatedIdentifiers = [...identifiers];
              updatedIdentifiers[currentIndex] = identifier;
              onUpdate(updatedIdentifiers);
            }
          }}
        />
      ) : null}
    </>
  );
};

export default NodeResourceTable;
