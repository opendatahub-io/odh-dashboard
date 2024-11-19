import * as React from 'react';
import { Card, CardTitle, CardHeader, Divider, Popover } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import DashboardPopupIconButton from '~/concepts/dashboard/DashboardPopupIconButton';

export const DWSectionCard: React.FC<{
  title: string;
  helpTooltip?: React.ReactNode;
  hasDivider?: boolean;
  content: React.ReactNode;
}> = ({ title, hasDivider = true, helpTooltip, content }) => (
  <Card isFullHeight>
    <CardHeader>
      <CardTitle>
        {title}
        {helpTooltip ? (
          <Popover bodyContent={helpTooltip}>
            <DashboardPopupIconButton
              icon={<OutlinedQuestionCircleIcon />}
              aria-label="More info"
            />
          </Popover>
        ) : null}
      </CardTitle>
    </CardHeader>
    {hasDivider && <Divider />}
    {content}
  </Card>
);
