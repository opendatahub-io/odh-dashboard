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
import StandardTaskNode from '#~/concepts/topology/customNodes/StandardTaskNode';
import { ICON_TASK_NODE_TYPE } from './utils';
import ArtifactTaskNode from './customNodes/ArtifactTaskNode';
import PipelineTaskEdge from './PipelineTaskEdge';
import PipelineDefaultTaskGroup from './PipelineDefaultTaskGroup';
import { EXECUTION_TASK_NODE_TYPE } from './const';

export const pipelineComponentFactory: ComponentFactory = (kind, type) => {
  if (kind === ModelKind.graph) {
    return withPanZoom()(withSelection()(GraphComponent));
  }
  switch (type) {
    case DEFAULT_TASK_NODE_TYPE:
      return withSelection()(StandardTaskNode);
    case ICON_TASK_NODE_TYPE:
      return withSelection()(ArtifactTaskNode);
    case DEFAULT_SPACER_NODE_TYPE:
      return SpacerNode;
    case DEFAULT_EDGE_TYPE:
      return withSelection()(PipelineTaskEdge);
    case EXECUTION_TASK_NODE_TYPE:
      return withSelection()(PipelineDefaultTaskGroup);
    default:
      return undefined;
  }
};
