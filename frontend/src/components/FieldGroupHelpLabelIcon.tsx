import * as React from 'react';
import { Popover } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { DashboardPopupIconButton } from '@odh-dashboard/ui-core';

type FieldGroupHelpLabelIconProps = {
  content: React.ComponentProps<typeof Popover>['bodyContent'];
  onClick?: () => void;
};

const FieldGroupHelpLabelIcon: React.FC<FieldGroupHelpLabelIconProps> = ({ content, onClick }) => (
  <Popover bodyContent={content}>
    <DashboardPopupIconButton
      icon={<OutlinedQuestionCircleIcon />}
      aria-label="More info"
      onClick={onClick}
    />
  </Popover>
);

export default FieldGroupHelpLabelIcon;
