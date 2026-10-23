import {
  DEFAULT_TASK_NODE_TYPE,
  pipelineElementFactory,
  Visualization,
} from '@patternfly/react-topology';
import {
  isHiddenByCollapsedAncestor,
  orderNodesForKeyboard,
  panFocusedControlIntoView,
} from '#~/concepts/topology/a11yUtils';

describe('orderNodesForKeyboard', () => {
  it('should place graph nodes and group children in visual reading order', () => {
    const controller = new Visualization();
    controller.registerElementFactory(pipelineElementFactory);
    controller.fromModel(
      {
        graph: { id: 'graph', type: 'graph' },
        nodes: [
          { id: 'z-last', type: DEFAULT_TASK_NODE_TYPE, x: 0, y: 200, width: 130, height: 35 },
          {
            id: 'a-group',
            type: DEFAULT_TASK_NODE_TYPE,
            x: 200,
            y: 100,
            width: 130,
            height: 100,
            group: true,
            style: { padding: [64, 15] },
            children: ['a-child-last', 'z-child-first'],
          },
          {
            id: 'a-child-last',
            type: DEFAULT_TASK_NODE_TYPE,
            x: 200,
            y: 160,
            width: 130,
            height: 35,
          },
          { id: 'z-first', type: DEFAULT_TASK_NODE_TYPE, x: 0, y: 100, width: 130, height: 35 },
          {
            id: 'z-child-first',
            type: DEFAULT_TASK_NODE_TYPE,
            x: 200,
            y: 100,
            width: 130,
            height: 35,
          },
        ],
      },
      false,
    );

    const graph = controller.getGraph();
    orderNodesForKeyboard(graph);

    expect(graph.getNodes().map((node) => node.getId())).toEqual(['z-first', 'a-group', 'z-last']);
    expect(
      controller
        .getNodeById('a-group')
        ?.getNodes()
        .map((node) => node.getId()),
    ).toEqual(['z-child-first', 'a-child-last']);
  });
});

describe('isHiddenByCollapsedAncestor', () => {
  it('should exclude nodes inside a collapsed group while keeping the group keyboard accessible', () => {
    const controller = new Visualization();
    controller.registerElementFactory(pipelineElementFactory);
    controller.fromModel(
      {
        graph: { id: 'graph', type: 'graph' },
        nodes: [
          {
            id: 'group',
            type: DEFAULT_TASK_NODE_TYPE,
            group: true,
            collapsed: true,
            children: ['child'],
          },
          { id: 'child', type: DEFAULT_TASK_NODE_TYPE },
        ],
      },
      false,
    );

    const group = controller.getNodeById('group');
    const child = controller.getNodeById('child');
    expect(group).toBeDefined();
    expect(child).toBeDefined();
    if (!group || !child) {
      return;
    }

    expect(isHiddenByCollapsedAncestor(group)).toBe(false);
    expect(isHiddenByCollapsedAncestor(child)).toBe(true);
    group.setCollapsed(false);
    expect(isHiddenByCollapsedAncestor(child)).toBe(false);
  });
});

describe('panFocusedControlIntoView', () => {
  it('should pan an offscreen group control into the topology viewport', () => {
    const controller = new Visualization();
    controller.registerElementFactory(pipelineElementFactory);
    controller.fromModel(
      {
        graph: { id: 'graph', type: 'graph' },
        nodes: [{ id: 'group', type: DEFAULT_TASK_NODE_TYPE, group: true }],
      },
      false,
    );
    const group = controller.getNodeById('group');
    expect(group).toBeDefined();
    if (!group) {
      return;
    }

    const viewport = document.createElement('div');
    viewport.dataset.testId = 'topology';
    const button = document.createElement('button');
    viewport.append(button);
    document.body.append(viewport);
    jest.spyOn(viewport, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      right: 500,
      top: 100,
      bottom: 400,
    } as DOMRect);
    jest.spyOn(button, 'getBoundingClientRect').mockReturnValue({
      left: 80,
      right: 110,
      top: 40,
      bottom: 70,
    } as DOMRect);

    const positionBefore = controller.getGraph().getPosition().clone();
    panFocusedControlIntoView(group, button);

    expect(controller.getGraph().getPosition().x).toBe(positionBefore.x + 40);
    expect(controller.getGraph().getPosition().y).toBe(positionBefore.y + 80);

    // A partly clipped control should also move fully inside the padded viewport.
    jest.spyOn(button, 'getBoundingClientRect').mockReturnValue({
      left: 110,
      right: 240,
      top: 360,
      bottom: 390,
    } as DOMRect);
    const positionBeforePartialPan = controller.getGraph().getPosition().clone();
    panFocusedControlIntoView(group, button);
    expect(controller.getGraph().getPosition().x).toBe(positionBeforePartialPan.x + 10);
    expect(controller.getGraph().getPosition().y).toBe(positionBeforePartialPan.y - 10);
    viewport.remove();
  });
});
