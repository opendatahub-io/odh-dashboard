import React from 'react';
import { TableBase } from '#~/components/table';
import { NodeSelector } from '#~/types';
import NodeSelectorTableRow from '#~/pages/hardwareProfiles/nodeSelector/NodeSelectorTableRow';
import ManageNodeSelectorModal from '#~/pages/hardwareProfiles/nodeSelector/ManageNodeSelectorModal';
import { nodeSelectorColumns, NodeSelectorRow } from './const';

type NodeSelectorTableProps = {
  nodeSelector: NodeSelector;
  onUpdate?: (selectors: NodeSelector) => void;
};

const NodeSelectorTable: React.FC<NodeSelectorTableProps> = ({ nodeSelector, onUpdate }) => {
  const viewOnly = !onUpdate;
  const [editNodeSelector, setEditNodeSelector] = React.useState<
    { key: string; value: string } | undefined
  >();
  const [currentIndex, setCurrentIndex] = React.useState<number | undefined>();

  const data: NodeSelectorRow[] = React.useMemo(
    () => Object.entries(nodeSelector).map(([key, value]) => ({ key, value })),
    [nodeSelector],
  );

  return (
    <>
      <TableBase
        variant="compact"
        data-testid="hardware-profile-node-selectors-table"
        id="hardware-profile-node-selectors-table"
        data={data}
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
            onEdit={(ns) => {
              setEditNodeSelector(ns);
              setCurrentIndex(rowIndex);
            }}
            onDelete={() => {
              const updatedNodeSelectors = { ...nodeSelector };
              delete updatedNodeSelectors[data[rowIndex].key];
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
          onSave={(ns) => {
            if (currentIndex !== undefined) {
              const updatedNodeSelectors = { ...nodeSelector };
              delete updatedNodeSelectors[data[currentIndex].key];
              updatedNodeSelectors[ns.key] = ns.value;
              onUpdate?.(updatedNodeSelectors);
            }
          }}
        />
      ) : null}
    </>
  );
};

export default NodeSelectorTable;
