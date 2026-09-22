import * as React from 'react';
import {
  Button,
  EmptyState,
  EmptyStateVariant,
  SearchInput,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import QuotaUsageTreeView from './QuotaUsageTreeView';
import './QuotaUsageNavPanel.scss';
import { QUOTA_USAGE_SEARCH_TELEMETRY_DEBOUNCE } from '../../const';
import { QuotaSelection, QuotaTreeNode } from '../../types';
import {
  GPUAAS_EVENTS,
  QUOTA_USAGE_INTERACTION_TYPES,
} from '../../tracking/gpuaasTrackingConstants';
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
  tabLoadedAt: React.MutableRefObject<number>;
};

const QuotaUsageNavPanel: React.FC<QuotaUsageNavPanelProps> = ({
  tree,
  selection,
  onSelectionChange,
  tabLoadedAt,
}) => {
  const [searchValue, setSearchValue] = React.useState('');
  const [allExpanded, setAllExpanded] = React.useState<boolean | undefined>(true);
  const [expandedNodeIds, setExpandedNodeIds] = React.useState<Set<string>>(() => new Set());
  const searchTelemetryTimeoutRef = React.useRef<ReturnType<typeof setTimeout>>();
  const allExpandedRef = React.useRef(allExpanded);
  allExpandedRef.current = allExpanded;

  React.useEffect(
    () => () => {
      clearTimeout(searchTelemetryTimeoutRef.current);
    },
    [],
  );

  const trackSearch = (value: string) => {
    clearTimeout(searchTelemetryTimeoutRef.current);
    searchTelemetryTimeoutRef.current = setTimeout(() => {
      const matchCount = filterQuotaTreeByName(tree, value).length;
      fireMiscTrackingEvent(GPUAAS_EVENTS.COHORT_TREE_SEARCH_APPLIED, {
        matchCount,
        isEmptyResult: matchCount === 0,
      });
      fireMiscTrackingEvent(GPUAAS_EVENTS.QUOTA_USAGE_TAB_INTERACTED, {
        interactionType: QUOTA_USAGE_INTERACTION_TYPES.treeSearch,
        secondsSinceTabLoad: Math.round((Date.now() - tabLoadedAt.current) / 1000),
      });
    }, QUOTA_USAGE_SEARCH_TELEMETRY_DEBOUNCE);
  };

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

  let treeExpandKey: string;
  if (allExpanded === undefined) {
    treeExpandKey = `mixed-${searchValue.trim()}`;
  } else if (allExpanded) {
    treeExpandKey = 'expanded';
  } else {
    treeExpandKey = 'collapsed';
  }

  const handleToggleExpandAll = React.useCallback(() => {
    const isExpanded = allExpanded === false;
    fireMiscTrackingEvent(GPUAAS_EVENTS.COHORT_TREE_EXPAND_COLLAPSE_ALL_SELECTED, { isExpanded });
    fireMiscTrackingEvent(GPUAAS_EVENTS.QUOTA_USAGE_TAB_INTERACTED, {
      interactionType: QUOTA_USAGE_INTERACTION_TYPES.expandCollapseAll,
      secondsSinceTabLoad: Math.round((Date.now() - tabLoadedAt.current) / 1000),
    });
    if (allExpanded === false) {
      setExpandedNodeIds(collectAllExpandableNodeIds(filteredTree));
      setAllExpanded(true);
      return;
    }
    setAllExpanded(false);
    setExpandedNodeIds(new Set());
  }, [allExpanded, filteredTree, tabLoadedAt]);

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
        fireMiscTrackingEvent(GPUAAS_EVENTS.QUOTA_USAGE_TAB_INTERACTED, {
          interactionType: QUOTA_USAGE_INTERACTION_TYPES.treeSelect,
          secondsSinceTabLoad: Math.round((Date.now() - tabLoadedAt.current) / 1000),
        });
      }
    },
    [onSelectionChange, tabLoadedAt, tree],
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
          const expandableNodeIds = collectAllExpandableNodeIds(tree);
          expandableNodeIds.delete(nodeId);
          return expandableNodeIds;
        }
        const expandableNodeIds = new Set(prev);
        expandableNodeIds.delete(nodeId);
        return expandableNodeIds;
      });
    },
    [tree],
  );

  const navToolbar = (
    <Toolbar
      className="gpuaas-quota-usage-nav-panel__toolbar"
      inset={{ default: 'insetNone' }}
      style={toolbarInsetStyle}
      aria-label="Cohort hierarchy filters"
    >
      <ToolbarContent>
        <ToolbarItem style={toolbarSearchItemStyle}>
          <SearchInput
            placeholder="Search by name"
            value={searchValue}
            onChange={(_event, value) => {
              setSearchValue(value);
              if (value.trim()) {
                trackSearch(value);
              }
            }}
            onClear={() => {
              clearTimeout(searchTelemetryTimeoutRef.current);
              setSearchValue('');
              fireMiscTrackingEvent(GPUAAS_EVENTS.COHORT_TREE_SEARCH_APPLIED, {
                matchCount: tree.length,
                isEmptyResult: tree.length === 0,
              });
              fireMiscTrackingEvent(GPUAAS_EVENTS.QUOTA_USAGE_TAB_INTERACTED, {
                interactionType: QUOTA_USAGE_INTERACTION_TYPES.treeSearch,
                secondsSinceTabLoad: Math.round((Date.now() - tabLoadedAt.current) / 1000),
              });
            }}
            aria-label="Search by name"
            style={fullWidthStyle}
            inputProps={{ 'data-testid': 'quota-usage-nav-search' }}
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
      <div className="gpuaas-quota-usage-nav-panel__tree">
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
        {filteredTree.length === 0 && (
          <EmptyState
            headingLevel="h4"
            titleText="No results found"
            variant={EmptyStateVariant.sm}
            data-testid="quota-usage-nav-search-empty"
          />
        )}
      </div>
    </>
  );
};

export default QuotaUsageNavPanel;
