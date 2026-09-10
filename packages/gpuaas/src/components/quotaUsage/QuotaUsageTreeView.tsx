import * as React from 'react';
import { Icon, Label, Tooltip, TreeView, TreeViewDataItem } from '@patternfly/react-core';
import { InfrastructureIcon, ListIcon, ResourcesEmptyIcon } from '@patternfly/react-icons';
import { QUOTA_UNASSIGNED_LABEL } from '../../const';
import { QuotaTreeNode } from '../../types';

type QuotaUsageTreeViewProps = {
  nodes: QuotaTreeNode[];
  selectedNodeId?: string;
  expandedNodeIds: Set<string>;
  allExpanded?: boolean;
  expandStateKey: string;
  toolbar?: React.ReactNode;
  onSelectNode: (node: QuotaTreeNode) => void;
  onExpand: (nodeId: string) => void;
  onCollapse: (nodeId: string) => void;
};

const nodeIcon = (node: QuotaTreeNode): React.ReactNode | undefined => {
  if (node.type === 'cohort') {
    return (
      <Tooltip content="Cohort">
        <Label color="green" variant="filled" isCompact aria-label="Cohort">
          <Icon isInline size="sm">
            <InfrastructureIcon aria-hidden />
          </Icon>
        </Label>
      </Tooltip>
    );
  }
  if (node.type === 'clusterQueue') {
    return (
      <Tooltip content="Cluster queue">
        <Label color="blue" variant="filled" isCompact aria-label="Cluster queue">
          <Icon isInline size="sm">
            <ListIcon aria-hidden />
          </Icon>
        </Label>
      </Tooltip>
    );
  }
  return undefined;
};

const nodeName = (node: QuotaTreeNode): React.ReactNode => {
  if (node.type === 'unassigned') {
    return (
      <Tooltip content={QUOTA_UNASSIGNED_LABEL}>
        <Label
          variant="filled"
          isCompact
          icon={<ResourcesEmptyIcon aria-hidden />}
          data-testid={`gpuaas-quota-usage-tree-node-${node.name}`}
        >
          {QUOTA_UNASSIGNED_LABEL}
        </Label>
      </Tooltip>
    );
  }
  return <span data-testid={`gpuaas-quota-usage-tree-node-${node.name}`}>{node.name}</span>;
};

const mapNodesToTreeData = (
  nodes: QuotaTreeNode[],
  expandedNodeIds: Set<string>,
): TreeViewDataItem[] =>
  nodes.map((node) => ({
    id: node.id,
    name: nodeName(node),
    icon: nodeIcon(node),
    children:
      node.children.length > 0 ? mapNodesToTreeData(node.children, expandedNodeIds) : undefined,
    defaultExpanded: expandedNodeIds.has(node.id),
    selectable: node.selectable,
  }));

const QuotaUsageTreeView: React.FC<QuotaUsageTreeViewProps> = ({
  nodes,
  selectedNodeId,
  expandedNodeIds,
  allExpanded,
  expandStateKey,
  toolbar,
  onSelectNode,
  onExpand,
  onCollapse,
}) => {
  const nodeById = React.useMemo(() => {
    const map = new Map<string, QuotaTreeNode>();
    const visit = (treeNodes: QuotaTreeNode[]): void => {
      for (const node of treeNodes) {
        map.set(node.id, node);
        visit(node.children);
      }
    };
    visit(nodes);
    return map;
  }, [nodes]);

  const treeData = React.useMemo(
    () => mapNodesToTreeData(nodes, expandedNodeIds),
    [nodes, expandedNodeIds],
  );

  const activeItems = React.useMemo((): TreeViewDataItem[] | undefined => {
    if (!selectedNodeId) {
      return undefined;
    }
    const node = nodeById.get(selectedNodeId);
    if (!node) {
      return undefined;
    }
    return [{ id: node.id, name: node.name }];
  }, [nodeById, selectedNodeId]);

  const handleSelect = React.useCallback(
    (_event: React.MouseEvent, item: TreeViewDataItem) => {
      if (!item.id) {
        return;
      }
      const node = nodeById.get(item.id);
      if (node?.selectable) {
        onSelectNode(node);
      }
    },
    [nodeById, onSelectNode],
  );

  return (
    <TreeView
      className="gpuaas-quota-usage-tree"
      key={expandStateKey}
      data={treeData}
      defaultAllExpanded
      hasGuides
      hasSelectableNodes
      toolbar={toolbar}
      activeItems={activeItems}
      {...(allExpanded !== undefined ? { allExpanded } : {})}
      onSelect={handleSelect}
      onExpand={(_, item) => {
        if (item.id) {
          onExpand(item.id);
        }
      }}
      onCollapse={(_, item) => {
        if (item.id) {
          onCollapse(item.id);
        }
      }}
      aria-label="Nested cohorts"
    />
  );
};

export default QuotaUsageTreeView;
