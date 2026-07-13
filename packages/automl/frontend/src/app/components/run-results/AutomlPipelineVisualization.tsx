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
import TreeTopology from '~/app/topology/tree-view/TreeTopology';
import { transformPipelineData } from '~/app/topology/tree-view/transformPipelineData';
import type {
  PipelineVisualizationData,
  PipelineStatusFilter,
} from '~/app/topology/tree-view/types';
import type { TreeNodeData } from '~/app/topology/tree-view/TreeNode';
import StepDetailsPanel from './StepDetailsPanel';
import { getPipelineStatusFilterLabel, type PipelineTreeLoadingMode } from './pipelineStatusLabels';
import './AutomlPipelineVisualization.scss';

type AutomlPipelineVisualizationProps = {
  runTitle: string;
  runState?: string;
  treeViewData: PipelineVisualizationData;
  treeLoadingMode?: PipelineTreeLoadingMode;
  componentStageMap?: ComponentStageMap;
  pipelineRun?: PipelineRun;
};

const getDefaultStatusFilter = (runState?: string): PipelineStatusFilter => {
  if (!runState) {
    return 'loading';
  }
  const upper = runState.toUpperCase();
  if (upper === 'RUNNING' || upper === 'PENDING' || upper === 'PAUSED' || upper === 'CANCELING') {
    return 'in-progress';
  }
  if (upper === 'SUCCEEDED') {
    return 'completed';
  }
  if (upper === 'FAILED' || upper === 'CANCELED') {
    return 'error';
  }
  return 'in-progress';
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

  const visualizationData = React.useMemo(
    () => ({ ...treeViewData, statusFilter }),
    [treeViewData, statusFilter],
  );

  const selectedNodeId = selectedIds[0];
  const selectedNodeData = React.useMemo((): TreeNodeData | undefined => {
    if (!selectedNodeId) {
      return undefined;
    }
    const { nodes } = transformPipelineData(visualizationData);
    const node = nodes.find((n) => n.id === selectedNodeId);
    return node?.data;
  }, [selectedNodeId, visualizationData]);

  const statusLabel = getPipelineStatusFilterLabel(statusFilter);
  const showTreeLoadingState = treeLoadingMode != null;

  React.useEffect(() => {
    if (showTreeLoadingState) {
      setSelectedIds([]);
    }
  }, [showTreeLoadingState]);

  React.useEffect(() => {
    setSelectedIds([]);
  }, [statusFilter]);

  return (
    <div className="automl-pipeline-visualization" data-testid="automl-pipeline-visualization">
      <Flex
        className="automl-pipeline-visualization__header"
        alignItems={{ default: 'alignItemsCenter' }}
        justifyContent={{ default: 'justifyContentSpaceBetween' }}
        flexWrap={{ default: 'wrap' }}
        spaceItems={{ default: 'spaceItemsMd' }}
      >
        <FlexItem>
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            spaceItems={{ default: 'spaceItemsMd' }}
          >
            <FlexItem>
              <Title headingLevel="h3" size="lg">
                {runTitle}
              </Title>
            </FlexItem>
            <FlexItem>
              <Label variant="outline" color={statusLabel.color}>
                {statusLabel.text}
              </Label>
            </FlexItem>
          </Flex>
        </FlexItem>

        <FlexItem className="automl-pipeline-visualization__toolbar">
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            justifyContent={{ default: 'justifyContentFlexEnd' }}
            spaceItems={{ default: 'spaceItemsMd' }}
            flexWrap={{ default: 'wrap' }}
          >
            {showDetails ? (
              <FlexItem>
                <Button
                  variant="tertiary"
                  isInline
                  aria-expanded
                  onClick={() => setShowDetails(false)}
                  data-testid="hide-details"
                >
                  Hide details
                </Button>
              </FlexItem>
            ) : (
              <FlexItem>
                <Button
                  variant="tertiary"
                  isInline
                  aria-expanded={false}
                  onClick={() => setShowDetails(true)}
                  data-testid="show-details"
                >
                  Show details
                </Button>
              </FlexItem>
            )}
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
                  onClose={() => setShowDetails(false)}
                />
              </DrawerPanelContent>
            }
          >
            <DrawerContentBody className="automl-pipeline-visualization__drawer-content">
              <TreeTopology
                key={statusFilter}
                className="automl-tree-topology-container"
                data={visualizationData}
                loadingMode={treeLoadingMode}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
              />
            </DrawerContentBody>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
};

export default AutomlPipelineVisualization;
