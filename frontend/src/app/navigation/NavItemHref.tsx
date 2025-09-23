import * as React from 'react';
import { NavItem } from '@patternfly/react-core';
import { Link, useMatch } from 'react-router-dom';
import type {
  HrefNavItemExtension,
  StatusReport,
} from '@odh-dashboard/plugin-core/extension-points';
import { StatusReportLoader } from '#~/app/status-provider/StatusReportLoader';
import { StatusReportIcon } from '#~/app/status-provider/StatusReportIcon';
import { NavItemTitle } from './NavItemTitle';
import NavIcon from './NavIcon';

type Props = {
  extension: HrefNavItemExtension;
  onNotifyStatus?: (status: StatusReport | undefined) => void;
};

export const NavItemHref: React.FC<Props> = ({
  extension: {
    properties: { href, path, dataAttributes, title, statusProviderId, iconRef, label },
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
            navIcon={iconRef ? <NavIcon componentRef={iconRef} /> : null}
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
