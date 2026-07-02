import React from 'react';
import { Button, ButtonProps, Icon, IconComponentProps } from '@patternfly/react-core';

type DashboardPopupIconButtonProps = Omit<ButtonProps, 'variant' | 'isInline'> & {
  icon: React.ReactNode;
  iconProps?: Omit<IconComponentProps, 'isInline'>;
};

const DashboardPopupIconButton = ({
  icon,
  iconProps,
  ...props
}: DashboardPopupIconButtonProps): React.JSX.Element => (
  <Button
    icon={
      <Icon isInline {...iconProps}>
        {icon}
      </Icon>
    }
    variant="plain"
    isInline
    {...props}
  />
);

export default DashboardPopupIconButton;
