import React from 'react';
import {
  DrawerActions,
  DrawerCloseButton,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  Title,
} from '@patternfly/react-core';
import {
  MLFLOW_PROXY_BASE_PATH,
  WORKSPACE_QUERY_PARAM,
} from '@odh-dashboard/internal/routes/pipelines/mlflow';

type TraceDrawerPanelProps = {
  traceId: string;
  namespace: string;
  onClose: () => void;
};

const TraceDrawerPanel: React.FC<TraceDrawerPanelProps> = ({ traceId, namespace, onClose }) => {
  const mlflowTraceUrl = `${MLFLOW_PROXY_BASE_PATH}/#/traces/tr-${traceId}?${WORKSPACE_QUERY_PARAM}=${encodeURIComponent(namespace)}`;

  return (
    <DrawerPanelContent defaultSize="50%" minSize="400px" isResizable>
      <DrawerHead>
        <Title headingLevel="h3" size="lg">
          Trace Details
        </Title>
        <DrawerActions>
          <DrawerCloseButton onClick={onClose} />
        </DrawerActions>
      </DrawerHead>
      <DrawerPanelBody style={{ padding: 0, height: '100%' }}>
        <iframe
          src={mlflowTraceUrl}
          title="MLflow Trace Details"
          data-testid="trace-drawer-iframe"
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      </DrawerPanelBody>
    </DrawerPanelContent>
  );
};

export default TraceDrawerPanel;
