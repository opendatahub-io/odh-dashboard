import * as React from 'react';
import { ComponentCodeRef, LazyCodeRefComponent } from '@odh-dashboard/plugin-core';

const iconStyle = { width: 14, height: 14, color: 'var(--pf-t--color--gray--40)' };

interface NavIconProps {
  componentRef: ComponentCodeRef;
}

const NavIcon: React.FC<NavIconProps> = (props) => (
  <LazyCodeRefComponent component={props.componentRef} props={{ style: iconStyle }} />
);

export default NavIcon;
