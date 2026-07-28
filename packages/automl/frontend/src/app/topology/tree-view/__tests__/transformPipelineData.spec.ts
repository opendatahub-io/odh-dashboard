import type { PipelineNodeModelExpanded } from '~/app/types/topology';

jest.mock('@patternfly/react-topology', () => ({
  DEFAULT_SPACER_NODE_TYPE: 'spacer-node',
}));

jest.mock('~/app/topology/tree-view/transformStageMapNodesToTree', () => ({
  transformStageMapNodesToTree: jest.fn(),
}));

// eslint-disable-next-line import/first
import {
  getTreeTopologyFromResult,
  transformPipelineData,
} from '~/app/topology/tree-view/transformPipelineData';
// eslint-disable-next-line import/first
import { transformStageMapNodesToTree } from '~/app/topology/tree-view/transformStageMapNodesToTree';

const transformStageMapNodesToTreeMock = jest.mocked(transformStageMapNodesToTree);

const makeNode = (id: string): PipelineNodeModelExpanded =>
  ({
    id,
    type: 'AUTOML_TASK_NODE',
    label: id,
    width: 100,
    height: 40,
    runAfterTasks: [],
  }) as PipelineNodeModelExpanded;

describe('transformPipelineData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty status for missing stageMapNodes', () => {
    expect(transformPipelineData({})).toEqual({
      status: 'empty',
      topology: { nodes: [], edges: [] },
    });
    expect(transformStageMapNodesToTreeMock).not.toHaveBeenCalled();
  });

  it('should return empty status for an empty stageMapNodes array', () => {
    expect(transformPipelineData({ stageMapNodes: [] })).toEqual({
      status: 'empty',
      topology: { nodes: [], edges: [] },
    });
    expect(transformStageMapNodesToTreeMock).not.toHaveBeenCalled();
  });

  it('should return ok status with transformed topology', () => {
    const topology = {
      nodes: [{ id: 'a' }, { id: 'b' }],
      edges: [{ id: 'e-1', source: 'a', target: 'b' }],
    };
    transformStageMapNodesToTreeMock.mockReturnValue(topology as never);

    const stageMapNodes = [makeNode('a'), makeNode('b')];
    expect(transformPipelineData({ stageMapNodes })).toEqual({
      status: 'ok',
      topology,
    });
    expect(transformStageMapNodesToTreeMock).toHaveBeenCalledWith(stageMapNodes);
  });

  it('should return error status when transform throws instead of empty topology', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const error = new Error('layout failed');
    transformStageMapNodesToTreeMock.mockImplementation(() => {
      throw error;
    });

    const result = transformPipelineData({ stageMapNodes: [makeNode('a')] });

    expect(result).toEqual({ status: 'error', error });
    expect(getTreeTopologyFromResult(result)).toEqual({ nodes: [], edges: [] });
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});

describe('getTreeTopologyFromResult', () => {
  it('should return topology for ok and empty results', () => {
    const topology = { nodes: [], edges: [] };
    expect(getTreeTopologyFromResult({ status: 'ok', topology })).toBe(topology);
    expect(getTreeTopologyFromResult({ status: 'empty', topology })).toBe(topology);
  });
});
