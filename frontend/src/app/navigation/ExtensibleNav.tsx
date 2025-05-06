import React from 'react';
import { Nav, NavList } from '@patternfly/react-core';
import {
  isNavExtension,
  isNavSectionExtension,
  NavExtension,
} from '@odh-dashboard/plugin-core/extension-points';
import { useExtensions } from '@odh-dashboard/plugin-core';
import { NavItem } from './NavItem';
import { compareNavItemGroups } from './utils';

type Props = {
  label: string;
};

export const ExtensibleNav: React.FC<Props> = ({ label }) => {
  const extensions = useExtensions<NavExtension>(isNavExtension);
  const topLevelExtensions = React.useMemo(
    () =>
      extensions
        .filter((e) => isNavSectionExtension(e) || !e.properties.section)
        .toSorted(compareNavItemGroups),
    [extensions],
  );

  return (
    <Nav aria-label={label}>
      <NavList>
        {topLevelExtensions.map((extension) => (
          <NavItem key={extension.uid} extension={extension} />
        ))}
      </NavList>
    </Nav>
  );
};
