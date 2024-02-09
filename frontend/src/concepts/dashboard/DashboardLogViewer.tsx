import { LogViewer } from '@patternfly/react-log-viewer';
import React from 'react';

const DashboardLogViewer: React.FC<{
  data: string;
  logViewerRef: React.MutableRefObject<{ scrollToBottom: () => void } | undefined>;
  toolbar: JSX.Element | boolean;
  footer: JSX.Element | false;
  onScroll: React.ComponentProps<typeof LogViewer>['onScroll'];
  height?: number | string;
}> = ({ data, logViewerRef, toolbar, footer, onScroll, height = '100%' }) => (
  <LogViewer
    data-testid="logs"
    hasLineNumbers={false}
    data={data}
    innerRef={logViewerRef}
    height={height}
    toolbar={toolbar}
    footer={footer}
    onScroll={onScroll}
  />
);

export default DashboardLogViewer;
