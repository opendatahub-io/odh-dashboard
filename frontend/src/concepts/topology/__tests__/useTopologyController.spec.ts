import { testHook } from '@odh-dashboard/jest-config/hooks';
import { GRAPH_LAYOUT_END_EVENT, Visualization } from '@patternfly/react-topology';

const mockGraph = {
  fit: jest.fn(),
};

const mockVisualization = {
  setFitToScreenOnLayout: jest.fn(),
  registerElementFactory: jest.fn(),
  registerComponentFactory: jest.fn(),
  registerLayoutFactory: jest.fn(),
  fromModel: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  getGraph: jest.fn().mockReturnValue(mockGraph),
};

jest.mock('@patternfly/react-topology', () => ({
  ...jest.requireActual('@patternfly/react-topology'),
  Visualization: jest.fn().mockImplementation(() => mockVisualization),
}));

jest.mock('#~/concepts/topology/factories', () => ({
  pipelineComponentFactory: jest.fn(),
}));

jest.mock('#~/concepts/topology/const', () => ({
  PIPELINE_LAYOUT: 'PipelineDagreGroupsLayout',
  PIPELINE_NODE_SEPARATION_HORIZONTAL: 200,
  PIPELINE_NODE_SEPARATION_VERTICAL: 75,
}));

// eslint-disable-next-line import/first -- mock setup must come before the import
import useTopologyController from '#~/concepts/topology/useTopologyController';

describe('useTopologyController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a Visualization with fitToScreenOnLayout enabled', () => {
    testHook(useTopologyController)('g1');

    expect(Visualization).toHaveBeenCalledTimes(1);
    expect(mockVisualization.setFitToScreenOnLayout).toHaveBeenCalledWith(true);
  });

  it('should register a GRAPH_LAYOUT_END_EVENT listener', () => {
    testHook(useTopologyController)('g1');

    expect(mockVisualization.addEventListener).toHaveBeenCalledWith(
      GRAPH_LAYOUT_END_EVENT,
      expect.any(Function),
    );
  });

  it('should disable fitToScreenOnLayout after the first layout end event', () => {
    testHook(useTopologyController)('g1');

    // Extract the registered GRAPH_LAYOUT_END_EVENT handler
    const addEventCall = mockVisualization.addEventListener.mock.calls.find(
      ([event]: [string]) => event === GRAPH_LAYOUT_END_EVENT,
    );
    expect(addEventCall).toBeDefined();
    const layoutEndHandler = addEventCall[1] as () => void;

    // Simulate the first layout end
    layoutEndHandler();

    // Should fit, then disable auto-fit and unregister itself
    expect(mockGraph.fit).toHaveBeenCalledWith(75);
    expect(mockVisualization.setFitToScreenOnLayout).toHaveBeenCalledWith(false);
    expect(mockVisualization.removeEventListener).toHaveBeenCalledWith(
      GRAPH_LAYOUT_END_EVENT,
      layoutEndHandler,
    );
  });

  it('should return the controller', () => {
    const renderResult = testHook(useTopologyController)('g1');

    expect(renderResult.result.current).toBe(mockVisualization);
  });
});
