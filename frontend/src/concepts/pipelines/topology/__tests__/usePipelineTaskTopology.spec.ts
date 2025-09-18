import { DEFAULT_TASK_NODE_TYPE } from '@patternfly/react-topology';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import { usePipelineTaskTopology } from '#~/concepts/pipelines/topology';
import { mockLargePipelineSpec } from '#~/concepts/pipelines/topology/__tests__/mockPipelineSpec';
import { ICON_TASK_NODE_TYPE } from '#~/concepts/topology/utils';
import { EXECUTION_TASK_NODE_TYPE } from '#~/concepts/topology/const';
import { PipelineNodeModelExpanded } from '#~/concepts/topology/types';

describe('usePipelineTaskTopology', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(jest.fn());
  });

  it('returns the correct number of nodes', () => {
    const renderResult = testHook(usePipelineTaskTopology)(mockLargePipelineSpec);
    const nodes = renderResult.result.current;

    const pipelineNodes = nodes as PipelineNodeModelExpanded[];

    const tasks = pipelineNodes.filter((n) => n.type === DEFAULT_TASK_NODE_TYPE);
    const groups = pipelineNodes.filter((n) => n.type === EXECUTION_TASK_NODE_TYPE);
    const artifactNodes = pipelineNodes.filter((n) => n.type === ICON_TASK_NODE_TYPE);

    expect(pipelineNodes).toHaveLength(107);
    expect(tasks).toHaveLength(35);
    expect(groups).toHaveLength(5);
    expect(artifactNodes).toHaveLength(67);
  });
});
