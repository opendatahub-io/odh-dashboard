import React from 'react';
import { Button, ButtonProps, Icon } from '@patternfly/react-core';

type DashboardPopupIconButtonProps = Omit<ButtonProps, 'variant' | 'isInline' | 'style'> & {
  icon: React.ReactNode;
};

/**
 * Overriding PF's button styles to allow for a11y in opening tooltips or popovers on a single item
 */
const DashboardPopupIconButton = ({
  icon,
  ...props
}: DashboardPopupIconButtonProps): React.JSX.Element => (
  <Button
    icon={
      <Icon isInline style={{ marginLeft: 'var(--pf-t--global--spacer--xs)' }}>
        {icon}
      </Icon>
    }
    variant="plain"
    isInline
    style={{ padding: 0 }}
    {...props}
  />
);

export default DashboardPopupIconButton;
