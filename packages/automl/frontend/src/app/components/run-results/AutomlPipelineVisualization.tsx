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
import { canShowModelsExpandToggle } from '~/app/topology/tree-view/branchExpand';
import { ModelsExpandProvider } from '~/app/topology/tree-view/ModelsExpandContext';
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
import './AutomlPipelineVisualization.scss';

type AutomlPipelineVisualizationProps = {
  runTitle: string;
  runState?: string;
  treeViewData: PipelineVisualizationData;
  treeLoadingMode?: PipelineTreeLoadingMode;
  componentStageMap?: ComponentStageMap;
  pipelineRun?: PipelineRun;
};

const AutomlPipelineVisualization: React.FC<AutomlPipelineVisualizationProps> = ({
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
  const [modelsExpanded, setModelsExpanded] = React.useState(false);

  const showModelsToggle = React.useMemo(
    () => canShowModelsExpandToggle(treeViewData.stageMapNodes),
    [treeViewData.stageMapNodes],
  );

  const winnerResolved = statusFilter === 'completed' && !!treeViewData.selectedModel;

  const pipelineTopology = React.useMemo(
    () =>
      getTreeTopologyFromResult(
        transformPipelineData(treeViewData, {
          modelsExpanded,
          winnerResolved,
        }),
      ),
    [treeViewData, modelsExpanded, winnerResolved],
  );

  const modelsExpandValue = React.useMemo(
    () => ({
      modelsExpanded,
      showToggle: showModelsToggle,
      onToggle: () => setModelsExpanded((prev) => !prev),
    }),
    [modelsExpanded, showModelsToggle],
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
    if (!showModelsToggle && modelsExpanded) {
      setModelsExpanded(false);
    }
  }, [showModelsToggle, modelsExpanded]);

  return (
    <div className="automl-pipeline-visualization" data-testid="automl-pipeline-visualization">
      <Flex
        className="automl-pipeline-visualization__header"
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

      <div className="automl-pipeline-visualization__body">
        <Drawer isExpanded={showDetails} isInline>
          <DrawerContent
            panelContent={
              <DrawerPanelContent
                isResizable
                minSize="320px"
                defaultSize="320px"
                className="automl-pipeline-visualization__drawer-panel"
                data-testid="step-details-drawer-panel"
              >
                <StepDetailsPanel
                  selectedNodeId={selectedNodeId}
                  nodeData={selectedNodeData}
                  selectedModel={treeViewData.selectedModel}
                  statusFilter={statusFilter}
                  treeLoadingMode={treeLoadingMode}
                  componentStageMap={componentStageMap}
                  pipelineRun={pipelineRun}
                  onClose={handleCloseDetails}
                />
              </DrawerPanelContent>
            }
          >
            <DrawerContentBody className="automl-pipeline-visualization__drawer-content">
              <ModelsExpandProvider value={modelsExpandValue}>
                <TreeTopology
                  className="automl-tree-topology-container"
                  topology={pipelineTopology}
                  loadingMode={treeLoadingMode}
                  selectedIds={selectedIds}
                  onSelectionChange={handleSelectionChange}
                  layoutResetKey={modelsExpanded}
                />
              </ModelsExpandProvider>
            </DrawerContentBody>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
};

export default AutomlPipelineVisualization;
