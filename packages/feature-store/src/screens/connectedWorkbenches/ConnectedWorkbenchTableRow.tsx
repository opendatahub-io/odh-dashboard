import * as React from 'react';
import { Button, Label, LabelGroup, Tooltip } from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { Td, Tr } from '@patternfly/react-table';
import { useNavigate } from 'react-router-dom';
import {
  CONNECTED_WORKBENCH_PERMISSION_LABEL_THRESHOLD,
  NO_CONNECTED_WORKBENCH_TOOLTIP,
} from './const';
import FeatureStoreLabels from '../../components/FeatureStoreLabels';
import type { ConnectedWorkbenchTableRow as ConnectedWorkbenchTableRowData } from '../../types/connectedWorkbenches';

type Props = {
  row: ConnectedWorkbenchTableRowData;
};

const getWorkbenchLaunchPath = (row: ConnectedWorkbenchTableRowData): string => {
  const workbenchNamespace = row.workbenchNamespace ?? row.authorizedProject;
  return `/notebook/${workbenchNamespace}/${row.workbenchName ?? ''}`;
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
        >
          {overflowCount} more
        </Label>
      )}
    </LabelGroup>
  );
};

const ConnectedWorkbenchTableRow: React.FC<Props> = ({ row }) => {
  const navigate = useNavigate();
  const projectHref = `/projects/${row.authorizedProject}?section=workbenches`;

  return (
    <Tr>
      <Td dataLabel="Workbench">
        {row.workbenchName ? (
          <Button
            variant="link"
            isInline
            icon={<ExternalLinkAltIcon />}
            iconPosition="end"
            aria-label={`Open workbench ${row.workbenchName} in new tab`}
            data-testid={`connected-workbench-link-${row.workbenchName}`}
            onClick={() => {
              window.open(getWorkbenchLaunchPath(row), '_blank', 'noopener,noreferrer');
            }}
          >
            {row.workbenchName}
          </Button>
        ) : (
          <Tooltip content={NO_CONNECTED_WORKBENCH_TOOLTIP}>
            <span data-testid="connected-workbench-none">No connected workbench</span>
          </Tooltip>
        )}
      </Td>
      <Td dataLabel="Authorized project">
        <Button
          variant="link"
          isInline
          aria-label={`View project ${row.authorizedProject}`}
          data-testid={`connected-workbench-project-link-${row.authorizedProject}`}
          onClick={() => navigate(projectHref)}
        >
          {row.authorizedProject}
        </Button>
      </Td>
      <Td dataLabel="Permissions">
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
