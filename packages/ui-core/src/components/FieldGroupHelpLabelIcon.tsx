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
  let bodyContent: React.ComponentProps<typeof Popover>['bodyContent'] = content;

  if (popoverBodyTestId) {
    bodyContent =
      typeof content === 'function' ? (
        (hide) => <div data-testid={popoverBodyTestId}>{content(hide)}</div>
      ) : (
        <div data-testid={popoverBodyTestId}>{content}</div>
      );
  }

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
