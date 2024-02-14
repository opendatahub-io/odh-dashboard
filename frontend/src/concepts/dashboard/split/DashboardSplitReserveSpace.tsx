import * as React from 'react';
import { Split } from '@patternfly/react-core';

type DashboardSplitReserveSpaceProps = {
  visible: boolean;
} & React.ComponentProps<typeof Split>;

const DashboardSplitReserveSpace: React.FC<DashboardSplitReserveSpaceProps> = ({
  visible,
  ...props
}) => <Split {...props} style={{ visibility: visible ? 'visible' : 'hidden' }} />;

export default DashboardSplitReserveSpace;
