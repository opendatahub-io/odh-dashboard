import { LogViewer } from '@patternfly/react-log-viewer';
import React from 'react';

const DashboardLogViewer: React.FC<{
  data: string;
  logViewerRef: React.MutableRefObject<{ scrollToBottom: () => void } | undefined>;
  toolbar: JSX.Element | boolean;
  footer: JSX.Element | false;
  onScroll: React.ComponentProps<typeof LogViewer>['onScroll'];
}> = ({ data, logViewerRef, toolbar, footer, onScroll }) => (
  <LogViewer
    hasLineNumbers={false}
    data={data}
    innerRef={logViewerRef}
    height="100%"
    toolbar={toolbar}
    footer={footer}
    onScroll={onScroll}
  />
);

export default DashboardLogViewer;
