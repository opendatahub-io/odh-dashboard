import * as React from 'react';
import {
  StatusReport,
  NavExtension,
  isNavSectionExtension,
} from '@odh-dashboard/plugin-core/extension-points';
import { NavItemHref } from './NavItemHref';
import { NavSection } from './NavSection';

export type Props = {
  extension: NavExtension;
  onNotifyStatus?: (status: StatusReport | undefined) => void;
};

export const NavItem: React.FC<Props> = ({ extension, onNotifyStatus }) => {
  if (isNavSectionExtension(extension)) {
    return <NavSection extension={extension} />;
  }
  return <NavItemHref extension={extension} onNotifyStatus={onNotifyStatus} />;
};
