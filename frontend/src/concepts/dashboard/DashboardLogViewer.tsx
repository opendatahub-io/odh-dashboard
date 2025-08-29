import { LogViewer } from '@patternfly/react-log-viewer';
import React from 'react';

const DashboardLogViewer: React.FC<{
  data: string;
  logViewerRef: React.MutableRefObject<{ scrollToBottom: () => void } | undefined>;
  toolbar: JSX.Element | boolean;
  footer?: JSX.Element | false;
  onScroll: React.ComponentProps<typeof LogViewer>['onScroll'];
  height?: number | string;
  isTextWrapped?: boolean;
  hasLineNumbers?: boolean;
}> = ({
  data,
  logViewerRef,
  toolbar,
  footer,
  onScroll,
  height = '100%',
  isTextWrapped,
  hasLineNumbers = false,
}) => (
  <LogViewer
    data-testid="logs"
    hasLineNumbers={hasLineNumbers}
    data={data}
    innerRef={logViewerRef}
    height={height}
    toolbar={toolbar}
    footer={footer}
    onScroll={onScroll}
    isTextWrapped={isTextWrapped}
  />
);

export default DashboardLogViewer;
