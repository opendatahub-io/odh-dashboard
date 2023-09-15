import React from 'react';
import { Button, ButtonProps, Icon } from '@patternfly/react-core';

type DashboardPopupIconButtonProps = Omit<ButtonProps, 'variant' | 'isInline' | 'style'> & {
  icon: React.ReactNode;
};

/**
 * Overriding PF's button styles to allow for a11y in opening tooltips or popovers on a single item
 */
const DashboardPopupIconButton = ({ icon, ...props }: DashboardPopupIconButtonProps) => (
  <Button variant="plain" isInline style={{ padding: 0 }} {...props}>
    <Icon tabIndex={0} isInline style={{ marginLeft: 'var(--pf-global--spacer--xs)' }}>
      {icon}
    </Icon>
  </Button>
);

export default DashboardPopupIconButton;
