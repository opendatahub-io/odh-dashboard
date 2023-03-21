import {
  ComponentFactory,
  DEFAULT_EDGE_TYPE,
  DEFAULT_SPACER_NODE_TYPE,
  DEFAULT_TASK_NODE_TYPE,
  GraphComponent,
  ModelKind,
  SpacerNode,
  TaskEdge,
  TaskNode,
} from '@patternfly/react-topology';

// Topology gap... their types have issues with Strict TS mode
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export const pipelineComponentFactory: ComponentFactory = (kind, type) => {
  if (kind === ModelKind.graph) {
    return GraphComponent;
  }
  switch (type) {
    case DEFAULT_TASK_NODE_TYPE:
      return TaskNode;
    case DEFAULT_SPACER_NODE_TYPE:
      return SpacerNode;
    case DEFAULT_EDGE_TYPE:
      return TaskEdge;
    default:
      return undefined;
  }
};
