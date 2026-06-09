import * as React from 'react';
import { Label, LabelGroup, Truncate } from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { Td, Tr } from '@patternfly/react-table';
import { Link } from 'react-router-dom';
import { CONNECTED_WORKBENCH_PERMISSION_LABEL_THRESHOLD } from './const';
import FeatureStoreLabels from '../../components/FeatureStoreLabels';
import type { ConnectedWorkbenchTableRow as ConnectedWorkbenchTableRowData } from '../../types/connectedWorkbenches';

type Props = {
  row: ConnectedWorkbenchTableRowData;
};

const PermissionLabels: React.FC<{ permissions: string[] }> = ({ permissions }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const overflowCount = Math.max(
    permissions.length - CONNECTED_WORKBENCH_PERMISSION_LABEL_THRESHOLD,
    0,
  );
  const displayedPermissions = isExpanded
    ? permissions
    : permissions.slice(0, CONNECTED_WORKBENCH_PERMISSION_LABEL_THRESHOLD);

  return (
    <LabelGroup numLabels={permissions.length}>
      {displayedPermissions.map((permission) => (
        <FeatureStoreLabels key={permission} color="blue" variant="outline" isCompact>
          {permission}
        </FeatureStoreLabels>
      ))}
      {!isExpanded && overflowCount > 0 && (
        <Label
          data-testid="connected-workbench-permission-overflow"
          variant="overflow"
          isCompact
          onClick={() => setIsExpanded(true)}
          style={{ cursor: 'pointer' }}
        >
          {overflowCount} more
        </Label>
      )}
    </LabelGroup>
  );
};

const ConnectedWorkbenchTableRow: React.FC<Props> = ({ row }) => {
  const workbenchHref = `/projects/${row.authorizedProject}/spawner/${row.workbenchName ?? ''}`;
  const projectHref = `/projects/${row.authorizedProject}?section=workbenches`;

  return (
    <Tr>
      <Td dataLabel="Workbench">
        {row.workbenchName ? (
          <Link
            to={workbenchHref}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--pf-t--global--spacer--xs)',
            }}
          >
            <Truncate content={row.workbenchName} style={{ textDecoration: 'underline' }} />
            <ExternalLinkAltIcon />
          </Link>
        ) : (
          'No connected workbench'
        )}
      </Td>
      <Td dataLabel="Authorized project">
        <Link to={projectHref}>
          <Truncate content={row.authorizedProject} style={{ textDecoration: 'underline' }} />
        </Link>
      </Td>
      <Td dataLabel="Permission">
        {row.permissionLevel.length > 0 ? (
          <PermissionLabels permissions={row.permissionLevel} />
        ) : (
          '-'
        )}
      </Td>
    </Tr>
  );
};

export default ConnectedWorkbenchTableRow;
