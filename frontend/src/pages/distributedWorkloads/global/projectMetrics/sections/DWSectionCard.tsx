import * as React from 'react';
import { Card, CardTitle, CardHeader, Divider } from '@patternfly/react-core';
import DashboardHelpTooltip from '~/concepts/dashboard/DashboardHelpTooltip';

export const DWSectionCard: React.FC<{
  title: string;
  helpTooltip?: string;
  hasDivider?: boolean;
  content: React.ReactNode;
}> = ({ title, hasDivider = true, helpTooltip, content }) => (
  <Card isFullHeight className="dw-section-card">
    <CardHeader>
      <CardTitle>
        {title} {helpTooltip ? <DashboardHelpTooltip content={helpTooltip} /> : null}
      </CardTitle>
    </CardHeader>
    {hasDivider && <Divider />}
    {content}
  </Card>
);
