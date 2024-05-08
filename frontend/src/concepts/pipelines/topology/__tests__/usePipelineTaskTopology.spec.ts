import { DEFAULT_TASK_NODE_TYPE } from '@patternfly/react-topology';
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import { usePipelineTaskTopology } from '~/concepts/pipelines/topology';
import { mockLargePipelineSpec } from '~/concepts/pipelines/topology/__tests__/mockPipelineSpec';
import { ICON_TASK_NODE_TYPE } from '~/concepts/topology/utils';
import { EXECUTION_TASK_NODE_TYPE } from '~/concepts/topology/const';

describe('usePipelineTaskTopology', () => {
  it('returns the correct number of nodes', () => {
    const renderResult = testHook(usePipelineTaskTopology)(mockLargePipelineSpec);
    const nodes = renderResult.result.current;

    const tasks = nodes.filter((n) => n.type === DEFAULT_TASK_NODE_TYPE);
    const groups = nodes.filter((n) => n.type === EXECUTION_TASK_NODE_TYPE);
    const artifactNodes = nodes.filter((n) => n.type === ICON_TASK_NODE_TYPE);

    expect(nodes).toHaveLength(86);
    expect(tasks).toHaveLength(35);
    expect(groups).toHaveLength(5);
    expect(artifactNodes).toHaveLength(46);
  });
});
