import {
  ComponentFactory,
  DEFAULT_EDGE_TYPE,
  DEFAULT_SPACER_NODE_TYPE,
  DEFAULT_TASK_NODE_TYPE,
  GraphComponent,
  ModelKind,
  SpacerNode,
  withPanZoom,
  withSelection,
} from '@patternfly/react-topology';
import StandardTaskNode from '~/concepts/topology/customNodes/StandardTaskNode';
import TaskEdge from './TaskEdge';
// Topology gap... their types have issues with Strict TS mode
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export const pipelineComponentFactory: ComponentFactory = (kind, type) => {
  if (kind === ModelKind.graph) {
    return withPanZoom()(GraphComponent);
  }
  switch (type) {
    case DEFAULT_TASK_NODE_TYPE:
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return withSelection()(StandardTaskNode);
    case DEFAULT_SPACER_NODE_TYPE:
      return SpacerNode;
    case DEFAULT_EDGE_TYPE:
      return TaskEdge;
    default:
      return undefined;
  }
};
