import * as React from 'react';
import { Popover } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import DashboardPopupIconButton from './DashboardPopupIconButton';

type FieldGroupHelpLabelIconProps = {
  title?: React.ComponentProps<typeof Popover>['headerContent'];
  content: React.ComponentProps<typeof Popover>['bodyContent'];
  onClick?: () => void;
  buttonTestId?: string;
  popoverBodyTestId?: string;
};

const FieldGroupHelpLabelIcon: React.FC<FieldGroupHelpLabelIconProps> = ({
  title,
  content,
  onClick,
  buttonTestId,
  popoverBodyTestId,
}) => {
  const bodyContent: React.ComponentProps<typeof Popover>['bodyContent'] = popoverBodyTestId
    ? typeof content === 'function'
      ? (hide) => <div data-testid={popoverBodyTestId}>{content(hide)}</div>
      : <div data-testid={popoverBodyTestId}>{content}</div>
    : content;

  return (
    <Popover
      {...(title ? { headerContent: title, showClose: true } : {})}
      bodyContent={bodyContent}
    >
      <DashboardPopupIconButton
        icon={<OutlinedQuestionCircleIcon />}
        aria-label="More info"
        {...(buttonTestId ? { 'data-testid': buttonTestId } : {})}
        onClick={onClick}
      />
    </Popover>
  );
};

export default FieldGroupHelpLabelIcon;
