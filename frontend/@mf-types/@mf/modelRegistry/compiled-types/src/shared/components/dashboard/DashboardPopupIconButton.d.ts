import React from 'react';
import { ButtonProps, IconComponentProps } from '@patternfly/react-core';
type DashboardPopupIconButtonProps = Omit<ButtonProps, 'variant' | 'isInline'> & {
    icon: React.ReactNode;
    iconProps?: Omit<IconComponentProps, 'isInline'>;
};
/**
 * Overriding PF's button styles to allow for a11y in opening tooltips or popovers on a single item
 */
declare const DashboardPopupIconButton: ({ icon, iconProps, ...props }: DashboardPopupIconButtonProps) => React.JSX.Element;
export default DashboardPopupIconButton;
