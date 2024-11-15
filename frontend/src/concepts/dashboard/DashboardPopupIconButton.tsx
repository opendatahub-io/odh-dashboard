import React from 'react';
import { Button, ButtonProps, Icon } from '@patternfly/react-core';

type DashboardPopupIconButtonProps = Omit<ButtonProps, 'variant' | 'isInline' | 'style'> & {
  icon: React.ReactNode;
  iconStatus?: 'custom' | 'info' | 'success' | 'warning' | 'danger';
};

/**
 * Overriding PF's button styles to allow for a11y in opening tooltips or popovers on a single item
 */
const DashboardPopupIconButton = ({
  icon,
  iconStatus,
  ...props
}: DashboardPopupIconButtonProps): React.JSX.Element => (
  <Button variant="plain" isInline style={{ padding: 0 }} {...props}>
    <Icon isInline style={{ marginLeft: 'var(--pf-v5-global--spacer--xs)' }} status={iconStatus}>
      {icon}
    </Icon>
  </Button>
);

export default DashboardPopupIconButton;
