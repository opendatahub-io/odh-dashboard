import { DEFAULT_TASK_NODE_TYPE, PipelineNodeModel } from '@patternfly/react-topology';
import { NODE_HEIGHT, NODE_WIDTH } from '~/concepts/pipelines/topology/const';
import { NodeDetails } from '~/concepts/pipelines/topology/types';
import { genRandomChars } from '~/utilities/string';

export const createNodeId = (prefix = 'node'): string => `${prefix}-${genRandomChars()}`;

export const createNode = (details: NodeDetails): PipelineNodeModel => ({
  id: details.id,
  label: details.label,
  type: DEFAULT_TASK_NODE_TYPE,
  width: NODE_WIDTH,
  height: NODE_HEIGHT,
  runAfterTasks: details.runAfter,
});
