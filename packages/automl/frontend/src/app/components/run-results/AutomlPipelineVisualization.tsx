import { Button, Flex, FlexItem, Title } from '@patternfly/react-core';
import React from 'react';
import TreeTopology from '~/app/topology/tree-view/TreeTopology';
import { transformPipelineData } from '~/app/topology/tree-view/transformPipelineData';
import type { PipelineVisualizationData } from '~/app/topology/tree-view/types';
import type { TreeNodeData } from '~/app/topology/tree-view/TreeNode';
import {
  PipelineDisplayProvider,
  type PipelineDisplaySettings,
  type PipelineStatusFilter,
} from '~/app/topology/tree-view/PipelineDisplayContext';
import StepDetailsPanel from './StepDetailsPanel';
import './AutomlPipelineVisualization.scss';

type AutomlPipelineVisualizationProps = {
  runTitle: string;
  runState?: string;
  treeViewData: PipelineVisualizationData;
  loading?: boolean;
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

const getFilterStatusLabel = (
  statusFilter: PipelineStatusFilter,
): { text: string; status: 'success' | 'info' | 'warning' | 'danger' } => {
  switch (statusFilter) {
    case 'loading':
      return { text: 'Preparing', status: 'info' };
    case 'in-progress':
      return { text: 'In progress', status: 'info' };
    case 'completed':
      return { text: 'Succeeded', status: 'success' };
    case 'error':
      return { text: 'Failed', status: 'danger' };
  }
};

const AutomlPipelineVisualization: React.FC<AutomlPipelineVisualizationProps> = ({
  runTitle,
  runState,
  treeViewData,
  loading,
}) => {
  const statusFilter = React.useMemo((): PipelineStatusFilter => {
    if (loading || !runState) {
      return 'loading';
    }
    return getDefaultStatusFilter(runState);
  }, [loading, runState]);

  const displaySettings = React.useMemo<PipelineDisplaySettings>(
    () => ({
      labelMode: 'visible',
      showLabels: true,
      statusFilter,
    }),
    [statusFilter],
  );

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

  const statusLabel = getFilterStatusLabel(statusFilter);
  const showPreparingState = loading || statusFilter === 'loading';
  const hasAutoSelected = React.useRef(false);

  React.useEffect(() => {
    hasAutoSelected.current = false;
  }, [statusFilter]);

  React.useEffect(() => {
    if (showPreparingState) {
      setSelectedIds([]);
      return;
    }
    if (hasAutoSelected.current) {
      return;
    }
    const { nodes } = transformPipelineData(visualizationData);
    let autoSelect;

    switch (statusFilter) {
      case 'completed':
        autoSelect =
          nodes.find((node) => node.id.endsWith('__build_leaderboard')) ??
          nodes.find((node) => /__model__branch-\d+$/.test(node.id));
        break;
      case 'error':
        autoSelect = nodes.find((node) => node.data?.stepState === 'failed');
        break;
      case 'in-progress': {
        autoSelect = nodes.find((node) => node.data?.stepState === 'active');
        break;
      }
      default:
        break;
    }

    if (autoSelect) {
      setSelectedIds([autoSelect.id]);
      hasAutoSelected.current = true;
    }
  }, [showPreparingState, visualizationData, statusFilter]);

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
              <Title headingLevel="h2" size="xl">
                {runTitle}
              </Title>
            </FlexItem>
            <FlexItem>
              <span
                className={`automl-pipeline-visualization__run-status automl-pipeline-visualization__run-status--${statusFilter}`}
                data-testid="run-status-badge"
              >
                {statusLabel.text}
              </span>
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
                  variant="link"
                  isInline
                  onClick={() => setShowDetails(false)}
                  data-testid="hide-details"
                >
                  Hide details
                </Button>
              </FlexItem>
            ) : (
              <FlexItem>
                <Button
                  variant="link"
                  isInline
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

      <div
        className={`automl-pipeline-visualization__body${showDetails ? '' : ' automl-pipeline-visualization__body--full-width'}`}
      >
        <div className="automl-pipeline-visualization__graph">
          <PipelineDisplayProvider value={displaySettings}>
            <TreeTopology
              key={statusFilter}
              className="automl-tree-topology-container"
              data={visualizationData}
              loading={showPreparingState}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
            />
          </PipelineDisplayProvider>
        </div>
        {showDetails && (
          <div className="automl-pipeline-visualization__sidebar">
            <StepDetailsPanel
              selectedNodeId={selectedNodeId}
              nodeData={selectedNodeData}
              selectedModel={treeViewData.selectedModel}
              isPreparing={showPreparingState}
              statusFilter={statusFilter}
              onClose={() => setShowDetails(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AutomlPipelineVisualization;
