import * as React from 'react';
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-topology/src/css/topology-components';
import {
  observer,
  Edge,
  integralShapePath,
  ConnectorArrow,
  DagreLayoutOptions,
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
  const verticalLayout =
    (element.getGraph().getLayoutOptions?.() as DagreLayoutOptions).rankdir === 'TB';

  return (
    <g data-test-id="task-handler" className={groupClassName}>
      <path
        fillOpacity={0}
        d={integralShapePath(startPoint, endPoint, startIndent, nodeSeparation, verticalLayout)}
        shapeRendering="geometricPrecision"
      />
      <ConnectorArrow
        className={styles.topologyEdge}
        startPoint={endPoint.clone().translate(0, -1)}
        endPoint={endPoint}
      />
    </g>
  );
};

export default observer(TaskEdge);
