import * as React from 'react';
import { Popover } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import DashboardPopupIconButton from './DashboardPopupIconButton';

type DashboardHelpTooltipProps = {
  content: React.ReactNode;
};

const DashboardHelpTooltip: React.FC<DashboardHelpTooltipProps> = ({ content }) => (
  <Popover bodyContent={content}>
    <DashboardPopupIconButton icon={<OutlinedQuestionCircleIcon />} aria-label="More info" />
  </Popover>
);

export default DashboardHelpTooltip;
