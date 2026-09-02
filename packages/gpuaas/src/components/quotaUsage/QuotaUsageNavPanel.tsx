import * as React from 'react';
import { Button, SearchInput, Toolbar, ToolbarContent, ToolbarItem } from '@patternfly/react-core';
import QuotaUsageTreeView from './QuotaUsageTreeView';
import { QuotaSelection, QuotaTreeNode } from '../../types';
import {
  collectAllExpandableNodeIds,
  collectExpandedNodeIds,
  filterQuotaTreeByName,
  getAncestorNodeIds,
  getExpandedIdsForSelection,
  getQuotaNodePath,
  nodeIdFromSelection,
  selectionFromNode,
} from '../../utils/quotaUsageTreeUtils';

const toolbarInsetStyle: React.CSSProperties = {
  paddingTop: 'var(--pf-t--global--spacer--sm)',
  paddingInline: 'var(--pf-t--global--spacer--sm)',
};

const toolbarSearchItemStyle: React.CSSProperties = {
  flexGrow: 1,
  minWidth: 0,
};

const fullWidthStyle: React.CSSProperties = {
  width: '100%',
};

type QuotaUsageNavPanelProps = {
  tree: QuotaTreeNode[];
  selection?: QuotaSelection;
  onSelectionChange: (selection: QuotaSelection) => void;
};

const QuotaUsageNavPanel: React.FC<QuotaUsageNavPanelProps> = ({
  tree,
  selection,
  onSelectionChange,
}) => {
  const [searchValue, setSearchValue] = React.useState('');
  const [allExpanded, setAllExpanded] = React.useState<boolean | undefined>(true);
  const [expandedNodeIds, setExpandedNodeIds] = React.useState<Set<string>>(() => new Set());
  const allExpandedRef = React.useRef(allExpanded);
  allExpandedRef.current = allExpanded;

  React.useEffect(() => {
    if (!selection || allExpandedRef.current !== undefined) {
      return;
    }
    const ancestorIds = getExpandedIdsForSelection(tree, selection);
    setExpandedNodeIds((prev) => new Set([...prev, ...ancestorIds]));
  }, [selection, tree]);

  const filteredTree = React.useMemo(
    () => filterQuotaTreeByName(tree, searchValue),
    [tree, searchValue],
  );

  const searchExpandedIds = React.useMemo(
    () => collectExpandedNodeIds(filteredTree, searchValue),
    [filteredTree, searchValue],
  );

  const isFullyCollapsed = allExpanded === false;

  const mergedExpandedIds = React.useMemo(() => {
    if (allExpanded === false) {
      return new Set<string>();
    }
    if (allExpanded === true) {
      return collectAllExpandableNodeIds(filteredTree);
    }
    const merged = new Set(expandedNodeIds);
    searchExpandedIds.forEach((id) => merged.add(id));
    return merged;
  }, [allExpanded, expandedNodeIds, filteredTree, searchExpandedIds]);

  const treeExpandKey =
    allExpanded === false ? 'collapsed' : allExpanded === true ? 'expanded' : 'mixed';

  const handleToggleExpandAll = React.useCallback(() => {
    if (allExpanded === false) {
      setExpandedNodeIds(collectAllExpandableNodeIds(filteredTree));
      setAllExpanded(true);
      return;
    }
    setAllExpanded(false);
    setExpandedNodeIds(new Set());
  }, [allExpanded, filteredTree]);

  const selectedNodeId = selection ? nodeIdFromSelection(selection) : undefined;

  const handleSelectNode = React.useCallback(
    (node: QuotaTreeNode) => {
      const path = getQuotaNodePath(tree, node.id);
      if (!path) {
        return;
      }
      const nextSelection = selectionFromNode(node, path);
      if (nextSelection) {
        if (allExpandedRef.current === undefined) {
          const ancestors = getAncestorNodeIds(tree, node.id) ?? [];
          setExpandedNodeIds((prev) => new Set([...prev, ...ancestors]));
        }
        onSelectionChange(nextSelection);
      }
    },
    [onSelectionChange, tree],
  );

  const handleExpand = React.useCallback((nodeId: string) => {
    setAllExpanded(undefined);
    setExpandedNodeIds((prev) => new Set([...prev, nodeId]));
  }, []);

  const handleCollapse = React.useCallback(
    (nodeId: string) => {
      setAllExpanded(undefined);
      setExpandedNodeIds((prev) => {
        if (allExpandedRef.current === true) {
          const next = collectAllExpandableNodeIds(filteredTree);
          next.delete(nodeId);
          return next;
        }
        const next = new Set(prev);
        next.delete(nodeId);
        return next;
      });
    },
    [filteredTree],
  );

  const navToolbar = (
    <Toolbar
      inset={{ default: 'insetNone' }}
      style={toolbarInsetStyle}
      aria-label="Cohort hierarchy filters"
    >
      <ToolbarContent>
        <ToolbarItem style={toolbarSearchItemStyle}>
          <SearchInput
            placeholder="Search by name"
            value={searchValue}
            onChange={(_event, value) => setSearchValue(value)}
            onClear={() => setSearchValue('')}
            aria-label="Search by name"
            style={fullWidthStyle}
            data-testid="quota-usage-nav-search"
          />
        </ToolbarItem>
        <ToolbarItem alignSelf="center">
          <Button
            variant="link"
            isInline
            onClick={handleToggleExpandAll}
            data-testid={isFullyCollapsed ? 'quota-usage-expand-all' : 'quota-usage-collapse-all'}
          >
            {isFullyCollapsed ? 'Expand all' : 'Collapse all'}
          </Button>
        </ToolbarItem>
      </ToolbarContent>
    </Toolbar>
  );

  return (
    <>
      {navToolbar}
      <QuotaUsageTreeView
        expandStateKey={treeExpandKey}
        nodes={filteredTree}
        selectedNodeId={selectedNodeId}
        expandedNodeIds={mergedExpandedIds}
        allExpanded={allExpanded}
        onSelectNode={handleSelectNode}
        onExpand={handleExpand}
        onCollapse={handleCollapse}
      />
    </>
  );
};

export default QuotaUsageNavPanel;
