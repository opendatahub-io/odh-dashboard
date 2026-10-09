import {
  DEFAULT_TASK_NODE_TYPE,
  pipelineElementFactory,
  Visualization,
} from '@patternfly/react-topology';
import { isHiddenByCollapsedAncestor, orderNodesForKeyboard } from '#~/concepts/topology/a11yUtils';

describe('orderNodesForKeyboard', () => {
  it('places graph nodes and group children in visual reading order', () => {
    const controller = new Visualization();
    controller.registerElementFactory(pipelineElementFactory);
    controller.fromModel(
      {
        graph: { id: 'graph', type: 'graph' },
        nodes: [
          { id: 'last', type: DEFAULT_TASK_NODE_TYPE, x: 0, y: 200, width: 130, height: 35 },
          {
            id: 'group',
            type: DEFAULT_TASK_NODE_TYPE,
            x: 0,
            y: 100,
            width: 130,
            height: 100,
            group: true,
            children: ['child-last', 'child-first'],
          },
          { id: 'child-last', type: DEFAULT_TASK_NODE_TYPE, x: 0, y: 60, width: 130, height: 35 },
          { id: 'first', type: DEFAULT_TASK_NODE_TYPE, x: 0, y: 0, width: 130, height: 35 },
          { id: 'child-first', type: DEFAULT_TASK_NODE_TYPE, x: 0, y: 0, width: 130, height: 35 },
        ],
      },
      false,
    );

    const graph = controller.getGraph();
    orderNodesForKeyboard(graph);

    expect(graph.getNodes().map((node) => node.getId())).toEqual(['first', 'group', 'last']);
    expect(
      controller
        .getNodeById('group')
        ?.getNodes()
        .map((node) => node.getId()),
    ).toEqual(['child-first', 'child-last']);
  });
});

describe('isHiddenByCollapsedAncestor', () => {
  it('excludes nodes inside a collapsed group, while keeping the group keyboard accessible', () => {
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
