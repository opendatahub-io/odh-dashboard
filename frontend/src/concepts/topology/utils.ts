import { DEFAULT_TASK_NODE_TYPE } from '@patternfly/react-topology';
import { genRandomChars } from '~/utilities/string';
import { NODE_HEIGHT, NODE_WIDTH } from './const';
import { NodeConstructDetails, PipelineNodeModelExpanded } from './types';

export const createNodeId = (prefix = 'node'): string => `${prefix}-${genRandomChars()}`;

export const createNode = (details: NodeConstructDetails): PipelineNodeModelExpanded => ({
  id: details.id,
  label: details.label,
  type: DEFAULT_TASK_NODE_TYPE,
  width: NODE_WIDTH,
  height: NODE_HEIGHT,
  runAfterTasks: details.runAfter,
  data: details.status
    ? {
        status: details.status,
      }
    : undefined,
});
