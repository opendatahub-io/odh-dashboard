import React from 'react';
import { TableBase } from '~/components/table';
import { NodeSelector } from '~/types';
import NodeSelectorTableRow from '~/pages/hardwareProfiles/nodeSelector/NodeSelectorTableRow';
import ManageNodeSelectorModal from '~/pages/hardwareProfiles/nodeSelector/ManageNodeSelectorModal';
import { nodeSelectorColumns } from './const';

type NodeSelectorTableProps = {
  nodeSelectors: NodeSelector[];
  onUpdate?: (selectors: NodeSelector[]) => void;
};

const NodeSelectorTable: React.FC<NodeSelectorTableProps> = ({ nodeSelectors, onUpdate }) => {
  const viewOnly = !onUpdate;
  const [editNodeSelector, setEditNodeSelector] = React.useState<NodeSelector | undefined>();
  const [currentIndex, setCurrentIndex] = React.useState<number | undefined>();

  return (
    <>
      <TableBase
        variant="compact"
        data-testid="hardware-profile-node-selectors-table"
        id="hardware-profile-node-selectors-table"
        data={nodeSelectors}
        columns={
          viewOnly
            ? nodeSelectorColumns.filter((column) => column.field !== 'actions')
            : nodeSelectorColumns
        }
        rowRenderer={(cr, rowIndex) => (
          <NodeSelectorTableRow
            key={rowIndex}
            nodeSelector={cr}
            showActions={!viewOnly}
            onEdit={(nodeSelector) => {
              setEditNodeSelector(nodeSelector);
              setCurrentIndex(rowIndex);
            }}
            onDelete={() => {
              const updatedNodeSelectors = [...nodeSelectors];
              updatedNodeSelectors.splice(rowIndex, 1);
              onUpdate?.(updatedNodeSelectors);
            }}
          />
        )}
      />
      {editNodeSelector ? (
        <ManageNodeSelectorModal
          existingNodeSelector={editNodeSelector}
          onClose={() => {
            setEditNodeSelector(undefined);
            setCurrentIndex(undefined);
          }}
          onSave={(nodeSelector) => {
            if (currentIndex !== undefined) {
              const updatedNodeSelectors = [...nodeSelectors];
              updatedNodeSelectors[currentIndex] = nodeSelector;
              onUpdate?.(updatedNodeSelectors);
            }
          }}
        />
      ) : null}
    </>
  );
};

export default NodeSelectorTable;
