import { testHook } from '@odh-dashboard/jest-config/hooks';
import { GRAPH_LAYOUT_END_EVENT, Visualization } from '@patternfly/react-topology';

const mockGraph = {
  fit: jest.fn(),
};

// Track registered listeners so we can dispatch events and verify removal
const listeners = new Map<string, Set<() => void>>();

const mockVisualization = {
  setFitToScreenOnLayout: jest.fn(),
  registerElementFactory: jest.fn(),
  registerComponentFactory: jest.fn(),
  registerLayoutFactory: jest.fn(),
  fromModel: jest.fn(),
  addEventListener: jest.fn((event: string, handler: () => void) => {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    listeners.get(event)!.add(handler);
  }),
  removeEventListener: jest.fn((event: string, handler: () => void) => {
    listeners.get(event)?.delete(handler);
  }),
  getGraph: jest.fn().mockReturnValue(mockGraph),
};

const dispatchEvent = (event: string) => {
  // Snapshot the current handlers to avoid mutation during iteration
  const handlers = [...(listeners.get(event) ?? [])];
  handlers.forEach((h) => h());
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
    listeners.clear();
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

    // Dispatch the first layout end event
    dispatchEvent(GRAPH_LAYOUT_END_EVENT);

    // Should fit, then disable auto-fit and unregister itself
    expect(mockGraph.fit).toHaveBeenCalledWith(75);
    expect(mockVisualization.setFitToScreenOnLayout).toHaveBeenCalledWith(false);
    expect(mockVisualization.removeEventListener).toHaveBeenCalledWith(
      GRAPH_LAYOUT_END_EVENT,
      expect.any(Function),
    );
  });

  it('should only call fit once even when multiple layout end events fire', () => {
    testHook(useTopologyController)('g1');

    // Dispatch two layout end events
    dispatchEvent(GRAPH_LAYOUT_END_EVENT);
    dispatchEvent(GRAPH_LAYOUT_END_EVENT);

    // fit should have been called exactly once — the handler unregisters after the first
    expect(mockGraph.fit).toHaveBeenCalledTimes(1);
  });

  it('should return the controller', () => {
    const renderResult = testHook(useTopologyController)('g1');

    expect(renderResult.result.current).toBe(mockVisualization);
  });
});
