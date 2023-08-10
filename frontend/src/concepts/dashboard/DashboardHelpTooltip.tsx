import * as React from 'react';
import { Tooltip } from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';

type DashboardHelpTooltipProps = {
  content: string;
};

const DashboardHelpTooltip: React.FC<DashboardHelpTooltipProps> = ({ content }) => (
  <Tooltip removeFindDomNode content={content}>
    <HelpIcon />
  </Tooltip>
);

export default DashboardHelpTooltip;
