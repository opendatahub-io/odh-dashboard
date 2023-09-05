import * as React from 'react';
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/Topology/topology-components';
import {
  observer,
  Edge,
  integralShapePath,
  DEFAULT_SPACER_NODE_TYPE,
  ConnectorArrow,
} from '@patternfly/react-topology';
interface TaskEdgeProps {
  element: Edge;
  className?: string;
  nodeSeparation?: number;
}

const TaskEdge: React.FunctionComponent<TaskEdgeProps> = ({
  element,
  className,
  nodeSeparation,
}) => {
  const startPoint = element.getStartPoint();
  const endPoint = element.getEndPoint();
  const groupClassName = css(styles.topologyEdge, className);
  const startIndent: number = element.getData()?.indent || 0;

  return (
    <g data-test-id="task-handler" className={groupClassName}>
      <path
        fillOpacity={0}
        d={integralShapePath(startPoint, endPoint, startIndent, nodeSeparation)}
        shapeRendering="geometricPrecision"
      />

      {element.getTarget().getType() !== DEFAULT_SPACER_NODE_TYPE ? (
        <ConnectorArrow
          className={styles.topologyEdge}
          startPoint={endPoint.clone().translate(-1, 0)}
          endPoint={endPoint}
        />
      ) : null}
    </g>
  );
};

export default observer(TaskEdge);
