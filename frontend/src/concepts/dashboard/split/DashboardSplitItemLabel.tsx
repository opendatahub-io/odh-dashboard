import * as React from 'react';
import { Bullseye, SplitItem } from '@patternfly/react-core';

type DashboardSplitItemLabelProps = {
  children: React.ReactNode;
  width: string | number;
};

const DashboardSplitItemLabel: React.FC<DashboardSplitItemLabelProps> = ({ children, width }) => (
  <SplitItem style={{ width }}>
    <Bullseye>
      <div style={{ width: '100%' }}>{children}</div>
    </Bullseye>
  </SplitItem>
);

export default DashboardSplitItemLabel;
