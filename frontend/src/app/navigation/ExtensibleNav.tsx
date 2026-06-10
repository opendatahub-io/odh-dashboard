import React from 'react';
import { Nav, NavList } from '@patternfly/react-core';
import {
  isNavExtension,
  isTabRoutePageExtension,
  NavExtension,
  TabRoutePageExtension,
} from '@odh-dashboard/plugin-core/extension-points';
import { useExtensions } from '@odh-dashboard/plugin-core';
import { NavItem } from './NavItem';
import { getTopLevelExtensions } from './utils';

type Props = {
  label: string;
};

type AnyNavExtension = NavExtension | TabRoutePageExtension;

export const ExtensibleNav: React.FC<Props> = ({ label }) => {
  const navExtensions = useExtensions<NavExtension>(isNavExtension);
  const tabRouteExtensions = useExtensions<TabRoutePageExtension>(isTabRoutePageExtension);
  const topLevelExtensions = React.useMemo(
    () => getTopLevelExtensions<AnyNavExtension>([...navExtensions, ...tabRouteExtensions]),
    [navExtensions, tabRouteExtensions],
  );

  return (
    <Nav aria-label={label}>
      <NavList>
        {topLevelExtensions.map((extension) => (
          <NavItem key={extension.properties.id} extension={extension} />
        ))}
      </NavList>
    </Nav>
  );
};
