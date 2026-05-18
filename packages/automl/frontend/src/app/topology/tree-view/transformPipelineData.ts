import type { EdgeModel } from '@patternfly/react-topology';
import type { TreeNodeData } from './TreeNode';
import type { TreeNodeModel, PipelineVisualizationData, TreeTopologyData } from './types';
import { TREE_NODE_TYPE, TREE_EDGE_TYPE } from './treeFactories';

// Node dimensions for edge anchoring
const STANDARD_NODE_SIZE = 16;
const PIPELINE_BADGE_SIZE = 32;

// Spacing constants
const X_START = 50;
const X_GAP = 130;
const Y_CENTER = 250;
const Y_PIPELINE_GAP = 100;

// Input data loader steps (maps to first part of pipeline)
const INPUT_DATA_LOADER_STEPS = [
  'Read dataset',
  'Split holdout data',
  'Read training data',
  'Preprocessing',
  'Model selection',
];

// Model generation steps (maps to each model's pipeline)
const MODEL_GENERATION_STEPS = [
  'Hyperparameter optimization',
  'Feature engineering',
  'Hyperparameter optimization',
  'Ensemble creation',
];

// Final steps after all models converge
const FINAL_STEPS = ['Model evaluation', 'Select best model'];

// Placeholder models shown when model generation fails before producing any models
const FAILED_PLACEHOLDER_MODELS = [
  { id: 'placeholder-1', name: 'Model 1' },
  { id: 'placeholder-2', name: 'Model 2' },
  { id: 'placeholder-3', name: 'Model 3' },
];

const createNode = (
  id: string,
  label: string,
  x: number,
  y: number,
  nodeType: TreeNodeData['nodeType'] = 'standard',
  pipelineId?: string,
): TreeNodeModel => {
  const size = pipelineId ? PIPELINE_BADGE_SIZE : STANDARD_NODE_SIZE;
  return {
    id,
    type: TREE_NODE_TYPE,
    label,
    x,
    y,
    width: size,
    height: size,
    data: {
      label,
      nodeType,
      pipelineId,
    },
  };
};

const createEdge = (id: string, source: string, target: string): EdgeModel => ({
  id,
  type: TREE_EDGE_TYPE,
  source,
  target,
});

/**
 * Calculate Y positions for pipelines based on number of models.
 * Centers the pipelines vertically around Y_CENTER.
 */
const calculatePipelineYPositions = (modelCount: number): number[] => {
  if (modelCount === 0) {
    return [];
  }
  if (modelCount === 1) {
    return [Y_CENTER];
  }

  const totalHeight = (modelCount - 1) * Y_PIPELINE_GAP;
  const startY = Y_CENTER - totalHeight / 2;

  return Array.from({ length: modelCount }, (_, i) => startY + i * Y_PIPELINE_GAP);
};

/**
 * Transforms pipeline visualization data into tree topology nodes and edges.
 */
export const transformPipelineData = (data: PipelineVisualizationData): TreeTopologyData => {
  const nodes: TreeNodeModel[] = [];
  const edges: EdgeModel[] = [];

  const { models, selectedModel, runState } = data;

  // X positions for different stages
  let currentX = X_START;

  // === Input Data Loader Section ===
  const inputDataLoaderNodeIds: string[] = [];
  INPUT_DATA_LOADER_STEPS.forEach((stepName, index) => {
    const nodeId = `input-${index}`;
    inputDataLoaderNodeIds.push(nodeId);
    nodes.push(createNode(nodeId, stepName, currentX, Y_CENTER));
    currentX += X_GAP * 0.8;
  });

  // Connect input data loader nodes
  for (let i = 0; i < inputDataLoaderNodeIds.length - 1; i++) {
    edges.push(
      createEdge(`e-input-${i}`, inputDataLoaderNodeIds[i], inputDataLoaderNodeIds[i + 1]),
    );
  }

  // Move X position for pipeline section
  currentX += X_GAP * 0.4;
  const pipelineStartX = currentX;

  // === Model Generation Section (per model) ===
  const lastModelStepIds: string[] = [];

  // Use placeholder models if failed with no models, otherwise use actual models
  const isFailedWithNoModels = runState === 'failed' && models.length === 0;
  const displayModels = isFailedWithNoModels ? FAILED_PLACEHOLDER_MODELS : models;
  const displayYPositions = calculatePipelineYPositions(displayModels.length);

  displayModels.forEach((model, modelIndex) => {
    const pipelineY = displayYPositions[modelIndex];
    const pipelinePrefix = `p${modelIndex + 1}`;
    const pipelineNodeIds: string[] = [];

    // Determine node type - use 'failed' for placeholder models
    const pipelineNodeType: TreeNodeData['nodeType'] = isFailedWithNoModels ? 'failed' : 'standard';
    const badgeNodeType: TreeNodeData['nodeType'] = isFailedWithNoModels
      ? 'failed'
      : 'pipeline-start';

    // Pipeline badge (P1, P2, etc.)
    const badgeId = `${pipelinePrefix}-badge`;
    nodes.push(
      createNode(badgeId, '', pipelineStartX, pipelineY, badgeNodeType, `P${modelIndex + 1}`),
    );
    pipelineNodeIds.push(badgeId);

    // Connect from model selection to pipeline badge
    const lastInputNodeId = inputDataLoaderNodeIds[inputDataLoaderNodeIds.length - 1];
    edges.push(createEdge(`e-input-to-${pipelinePrefix}`, lastInputNodeId, badgeId));

    // Model name node
    let stepX = pipelineStartX + X_GAP * 0.8;
    const modelNodeId = `${pipelinePrefix}-model`;
    nodes.push(createNode(modelNodeId, model.name, stepX, pipelineY, pipelineNodeType));
    pipelineNodeIds.push(modelNodeId);

    // Model generation steps
    MODEL_GENERATION_STEPS.forEach((stepName, stepIndex) => {
      stepX += X_GAP;
      const stepNodeId = `${pipelinePrefix}-step-${stepIndex}`;
      nodes.push(createNode(stepNodeId, stepName, stepX, pipelineY, pipelineNodeType));
      pipelineNodeIds.push(stepNodeId);
    });

    // Connect pipeline nodes
    for (let i = 0; i < pipelineNodeIds.length - 1; i++) {
      edges.push(
        createEdge(`e-${pipelinePrefix}-${i}`, pipelineNodeIds[i], pipelineNodeIds[i + 1]),
      );
    }

    // Track last node of each pipeline for convergence
    lastModelStepIds.push(pipelineNodeIds[pipelineNodeIds.length - 1]);

    // Update currentX to track the rightmost position
    if (stepX > currentX) {
      currentX = stepX;
    }
  });

  // === Final Section (convergence) ===
  currentX += X_GAP * 1.2;

  FINAL_STEPS.forEach((stepName, index) => {
    const isLastStep = index === FINAL_STEPS.length - 1;
    const nodeId = `final-${index}`;

    // Determine node type based on run state and selection
    let nodeType: TreeNodeData['nodeType'] = 'standard';
    if (isLastStep) {
      if (runState === 'completed' && selectedModel) {
        nodeType = 'success';
      } else if (runState === 'running') {
        nodeType = 'in-progress';
      } else if (runState === 'failed') {
        nodeType = 'failed';
      }
    }

    nodes.push(createNode(nodeId, stepName, currentX, Y_CENTER, nodeType));
    currentX += X_GAP;

    // Connect to previous final step
    if (index > 0) {
      edges.push(createEdge(`e-final-${index}`, `final-${index - 1}`, nodeId));
    }
  });

  // Connect all model pipelines to first final node (Model evaluation)
  lastModelStepIds.forEach((lastStepId, index) => {
    edges.push(createEdge(`e-converge-${index}`, lastStepId, 'final-0'));
  });

  return { nodes, edges };
};

/**
 * Creates mock pipeline data for testing/demo purposes.
 */
export const createMockPipelineData = (): PipelineVisualizationData => ({
  models: [
    { id: 'rf', name: 'Random Forest' },
    { id: 'xgb', name: 'XGBoost' },
    { id: 'lr', name: 'Logistic Regression' },
    { id: 'mlp', name: 'MLP' },
  ],
  selectedModel: 'xgb',
  runState: 'completed',
});
