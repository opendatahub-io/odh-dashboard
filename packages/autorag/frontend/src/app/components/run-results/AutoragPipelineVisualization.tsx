import {
  Button,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  DrawerPanelContent,
  Flex,
  FlexItem,
  Label,
  Title,
} from '@patternfly/react-core';
import React from 'react';
import type { ComponentStageMap } from '~/app/hooks/useComponentStageMap';
import type { PipelineRun } from '~/app/types';
import { canShowPatternsExpandToggle } from '~/app/topology/tree-view/branchExpand';
import { PatternsExpandProvider } from '~/app/topology/tree-view/PatternsExpandContext';
import TreeTopology from '~/app/topology/tree-view/TreeTopology';
import {
  getTreeTopologyFromResult,
  transformPipelineData,
} from '~/app/topology/tree-view/transformPipelineData';
import type {
  PipelineVisualizationData,
  PipelineStatusFilter,
} from '~/app/topology/tree-view/types';
import type { TreeNodeData } from '~/app/topology/tree-view/TreeNode';
import StepDetailsPanel from './StepDetailsPanel';
import {
  getDefaultStatusFilter,
  getPipelineStatusFilterLabel,
  getPipelineStatusLabelProps,
  type PipelineTreeLoadingMode,
} from './pipelineStatusLabels';
import './AutoragPipelineVisualization.scss';

type AutoragPipelineVisualizationProps = {
  runTitle: string;
  runState?: string;
  treeViewData: PipelineVisualizationData;
  treeLoadingMode?: PipelineTreeLoadingMode;
  componentStageMap?: ComponentStageMap;
  pipelineRun?: PipelineRun;
};

const AutoragPipelineVisualization: React.FC<AutoragPipelineVisualizationProps> = ({
  runTitle,
  runState,
  treeViewData,
  treeLoadingMode,
  componentStageMap,
  pipelineRun,
}) => {
  const statusFilter = React.useMemo((): PipelineStatusFilter => {
    if (treeLoadingMode === 'preparing' || !runState) {
      return 'loading';
    }
    return getDefaultStatusFilter(runState);
  }, [treeLoadingMode, runState]);

  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [showDetails, setShowDetails] = React.useState(true);
  const [patternsExpanded, setPatternsExpanded] = React.useState(false);

  const showPatternsToggle = React.useMemo(
    () => canShowPatternsExpandToggle(treeViewData.stageMapNodes),
    [treeViewData.stageMapNodes],
  );

  const winnerResolved = statusFilter === 'completed' && !!treeViewData.selectedPattern;

  const pipelineTopology = React.useMemo(
    () =>
      getTreeTopologyFromResult(
        transformPipelineData(treeViewData, {
          patternsExpanded,
          winnerResolved,
        }),
      ),
    [treeViewData, patternsExpanded, winnerResolved],
  );

  const patternsExpandValue = React.useMemo(
    () => ({
      patternsExpanded,
      showToggle: showPatternsToggle,
      onToggle: () => setPatternsExpanded((prev) => !prev),
    }),
    [patternsExpanded, showPatternsToggle],
  );

  const showTreeLoadingState = treeLoadingMode != null;
  const selectedNodeId = showTreeLoadingState ? undefined : selectedIds[0];
  const selectedNodeData = React.useMemo((): TreeNodeData | undefined => {
    if (!selectedNodeId) {
      return undefined;
    }
    const node = pipelineTopology.nodes.find((n) => n.id === selectedNodeId);
    return node?.data;
  }, [selectedNodeId, pipelineTopology]);

  const statusLabel = getPipelineStatusFilterLabel(statusFilter);

  const handleSelectionChange = React.useCallback(
    (nextSelectedIds: string[]) => {
      const nextSelectedId = nextSelectedIds[0];
      if (!showDetails && nextSelectedId && nextSelectedId !== selectedIds[0]) {
        setShowDetails(true);
      }
      setSelectedIds(nextSelectedIds);
    },
    [selectedIds, showDetails],
  );

  const handleCloseDetails = React.useCallback(() => {
    setShowDetails(false);
  }, []);

  React.useEffect(() => {
    if (showTreeLoadingState) {
      setSelectedIds([]);
    }
  }, [showTreeLoadingState]);

  React.useEffect(() => {
    if (!showPatternsToggle && patternsExpanded) {
      setPatternsExpanded(false);
    }
  }, [showPatternsToggle, patternsExpanded]);

  return (
    <div className="autorag-pipeline-visualization" data-testid="autorag-pipeline-visualization">
      <Flex
        className="autorag-pipeline-visualization__header"
        alignItems={{ default: 'alignItemsCenter' }}
        justifyContent={{ default: 'justifyContentSpaceBetween' }}
      >
        <FlexItem>
          <Flex>
            <FlexItem>
              <Title headingLevel="h3" size="lg">
                {runTitle}
              </Title>
            </FlexItem>
            <FlexItem>
              <Label
                variant="outline"
                data-testid="run-status-label"
                {...getPipelineStatusLabelProps(statusLabel)}
              >
                {statusLabel.text}
              </Label>
            </FlexItem>
          </Flex>
        </FlexItem>

        <FlexItem>
          <Flex>
            <FlexItem>
              <Button
                variant="tertiary"
                isInline
                aria-expanded={showDetails}
                onClick={() => setShowDetails((prev) => !prev)}
                data-testid={showDetails ? 'hide-details' : 'show-details'}
              >
                {showDetails ? 'Hide details' : 'Show details'}
              </Button>
            </FlexItem>
          </Flex>
        </FlexItem>
      </Flex>

      <div className="autorag-pipeline-visualization__body">
        <Drawer isExpanded={showDetails} isInline>
          <DrawerContent
            panelContent={
              <DrawerPanelContent
                isResizable
                minSize="320px"
                defaultSize="320px"
                className="autorag-pipeline-visualization__drawer-panel"
                data-testid="step-details-drawer-panel"
              >
                <StepDetailsPanel
                  selectedNodeId={selectedNodeId}
                  nodeData={selectedNodeData}
                  selectedPattern={treeViewData.selectedPattern}
                  statusFilter={statusFilter}
                  treeLoadingMode={treeLoadingMode}
                  componentStageMap={componentStageMap}
                  pipelineRun={pipelineRun}
                  onClose={handleCloseDetails}
                />
              </DrawerPanelContent>
            }
          >
            <DrawerContentBody className="autorag-pipeline-visualization__drawer-content">
              <PatternsExpandProvider value={patternsExpandValue}>
                <TreeTopology
                  className="autorag-tree-topology-container"
                  topology={pipelineTopology}
                  loadingMode={treeLoadingMode}
                  selectedIds={selectedIds}
                  onSelectionChange={handleSelectionChange}
                  layoutResetKey={patternsExpanded}
                />
              </PatternsExpandProvider>
            </DrawerContentBody>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
};

export default AutoragPipelineVisualization;
