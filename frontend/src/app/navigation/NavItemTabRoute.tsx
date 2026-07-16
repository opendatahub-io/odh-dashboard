import * as React from 'react';
import { NavItem } from '@patternfly/react-core';
import { Link, useMatch } from 'react-router-dom';
import {
  isTabRouteTabExtension,
  TabRoutePageExtension,
  TabRouteTabExtension,
} from '@odh-dashboard/plugin-core/extension-points';
import { useExtensions } from '@odh-dashboard/plugin-core';
import { NavItemTitle } from './NavItemTitle';
import NavIcon from './NavIcon';

type Props = {
  extension: TabRoutePageExtension;
};

export const NavItemTabRoute: React.FC<Props> = ({
  extension: {
    properties: { id, href, path, dataAttributes, title, iconRef },
  },
}) => {
  const allTabExtensions = useExtensions<TabRouteTabExtension>(isTabRouteTabExtension);
  const tabs = React.useMemo(
    () => allTabExtensions.filter((tab) => tab.properties.pageId === id),
    [allTabExtensions, id],
  );
  const isMatch = !!useMatch(path);

  // Don't render nav item if no tabs are registered
  if (tabs.length === 0) {
    return null;
  }

  return (
    <NavItem isActive={isMatch}>
      <Link {...dataAttributes} to={href}>
        <NavItemTitle
          title={title}
          navIcon={iconRef ? <NavIcon componentRef={iconRef} /> : null}
          statusIcon={null}
        />
      </Link>
    </NavItem>
  );
};
