import * as React from 'react';
import {
  StatusReport,
  NavExtension,
  TabRoutePageExtension,
  isNavSectionExtension,
  isTabRoutePageExtension,
} from '@odh-dashboard/plugin-core/extension-points';
import { NavItemHref } from './NavItemHref';
import { NavItemTabRoute } from './NavItemTabRoute';
import { NavSection } from './NavSection';

export type Props = {
  extension: NavExtension | TabRoutePageExtension;
  onNotifyStatus?: (status: StatusReport | undefined) => void;
};

export const NavItem: React.FC<Props> = ({ extension, onNotifyStatus }) => {
  if (isNavSectionExtension(extension)) {
    return <NavSection extension={extension} />;
  }
  if (isTabRoutePageExtension(extension)) {
    return <NavItemTabRoute extension={extension} />;
  }
  return <NavItemHref extension={extension} onNotifyStatus={onNotifyStatus} />;
};
