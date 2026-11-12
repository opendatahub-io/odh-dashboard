import { testHook } from '@odh-dashboard/jest-config/hooks';
import { GRAPH_LAYOUT_END_EVENT, Visualization } from '@patternfly/react-topology';

const mockGraph = {
  fit: jest.fn(),
  getNodes: jest.fn().mockReturnValue([]),
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

const flushLayoutEnd = () =>
  new Promise<void>((resolve) => {
    queueMicrotask(resolve);
  });

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

  it('should register persistent ordering and one-time initial fit listeners', () => {
    testHook(useTopologyController)('g1');

    expect(mockVisualization.addEventListener).toHaveBeenCalledTimes(2);
    expect(mockVisualization.addEventListener).toHaveBeenNthCalledWith(
      1,
      GRAPH_LAYOUT_END_EVENT,
      expect.any(Function),
    );
    expect(mockVisualization.addEventListener).toHaveBeenNthCalledWith(
      2,
      GRAPH_LAYOUT_END_EVENT,
      expect.any(Function),
    );
  });

  it('should disable fitToScreenOnLayout after the first layout end event', async () => {
    testHook(useTopologyController)('g1');

    // Dispatch the first layout end event
    dispatchEvent(GRAPH_LAYOUT_END_EVENT);
    await flushLayoutEnd();

    // Should fit, then disable auto-fit and unregister itself
    expect(mockGraph.fit).toHaveBeenCalledWith(75);
    expect(mockGraph.getNodes.mock.invocationCallOrder[0]).toBeLessThan(
      mockGraph.fit.mock.invocationCallOrder[0],
    );
    expect(mockVisualization.setFitToScreenOnLayout).toHaveBeenCalledWith(false);
    expect(listeners.get(GRAPH_LAYOUT_END_EVENT)?.size).toBe(1);
  });

  it('should reorder on every layout end but fit only once', async () => {
    testHook(useTopologyController)('g1');

    // Dispatch separate layout end events to verify each completed layout is ordered.
    dispatchEvent(GRAPH_LAYOUT_END_EVENT);
    await flushLayoutEnd();
    dispatchEvent(GRAPH_LAYOUT_END_EVENT);
    await flushLayoutEnd();

    // fit should have been called exactly once — the handler unregisters after the first
    expect(mockGraph.fit).toHaveBeenCalledTimes(1);
    expect(mockGraph.getNodes).toHaveBeenCalledTimes(2);
  });

  it('should remove both layout end listeners on unmount', () => {
    const renderResult = testHook(useTopologyController)('g1');

    expect(listeners.get(GRAPH_LAYOUT_END_EVENT)?.size).toBe(2);
    renderResult.unmount();

    expect(listeners.get(GRAPH_LAYOUT_END_EVENT)?.size).toBe(0);
  });

  it('should return the controller', () => {
    const renderResult = testHook(useTopologyController)('g1');

    expect(renderResult.result.current).toBe(mockVisualization);
  });
});
