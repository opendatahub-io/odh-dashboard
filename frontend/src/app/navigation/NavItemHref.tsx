import * as React from 'react';
import { NavItem } from '@patternfly/react-core';
import { Link, useMatch } from 'react-router-dom';
import type {
  HrefNavItemExtension,
  StatusReport,
} from '@odh-dashboard/plugin-core/extension-points';
import { StatusReportLoader } from '#~/app/status-provider/StatusReportLoader';
import { StatusReportIcon } from '#~/app/status-provider/StatusReportIcon';
import { asEnumMember } from '#~/utilities/utils.ts';
import { NavIconType } from '#~/concepts/design/utils.ts';
import { NavItemTitle } from './NavItemTitle';

type Props = {
  extension: HrefNavItemExtension;
  onNotifyStatus?: (status: StatusReport | undefined) => void;
};

export const NavItemHref: React.FC<Props> = ({
  extension: {
    properties: { href, path, dataAttributes, title, statusProviderId, icon, label },
  },
  onNotifyStatus,
}) => {
  const [status, setStatus] = React.useState<StatusReport | undefined>(undefined);
  const isMatch = !!useMatch(path ?? href);

  React.useEffect(
    () => () => {
      onNotifyStatus?.(undefined);
    },
    // notify on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <>
      <NavItem isActive={isMatch}>
        <Link {...dataAttributes} to={href}>
          <NavItemTitle
            title={title}
            navIcon={asEnumMember(icon, NavIconType) ?? undefined}
            statusIcon={status ? <StatusReportIcon status={status} isInline /> : null}
            label={label}
          />
        </Link>
      </NavItem>
      {statusProviderId ? (
        <StatusReportLoader
          statusProviderId={statusProviderId}
          onLoad={(_, summaryReport) => {
            onNotifyStatus?.(summaryReport);
            setStatus(summaryReport);
          }}
        />
      ) : null}
    </>
  );
};
