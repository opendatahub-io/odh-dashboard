import * as React from 'react';
import { Tooltip } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';

type DashboardHelpTooltipProps = {
  content: string;
};

const DashboardHelpTooltip: React.FC<DashboardHelpTooltipProps> = ({ content }) => (
  <Tooltip content={content}>
    <OutlinedQuestionCircleIcon />
  </Tooltip>
);

export default DashboardHelpTooltip;
