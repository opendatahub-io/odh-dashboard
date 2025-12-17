import * as React from 'react';
import { Truncate, Button, Tooltip, Spinner, Badge } from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';
import { LockIcon, UnlockIcon } from '@patternfly/react-icons';
import { CheckboxTd } from 'mod-arch-shared';
import { MCPServer } from '~/app/types';

interface MCPServerPanelRowProps {
  server: MCPServer;
  isChecked: boolean;
  onToggleCheck: () => void;
  onLockClick: () => void;
  onToolsClick: () => void;
  isLoading?: boolean;
  isStatusLoading?: boolean;
  isAuthenticated?: boolean;
  toolsCount?: number;
  isFetchingTools?: boolean;
}

const MCPServerPanelRow: React.FC<MCPServerPanelRowProps> = ({
  server,
  isChecked,
  onToggleCheck,
  onLockClick,
  onToolsClick,
  isLoading = false,
  isStatusLoading = false,
  isAuthenticated = false,
  toolsCount,
  isFetchingTools = false,
}) => {
  const disableToolIcon = isLoading || isStatusLoading || !isAuthenticated;

  // Determine badge text based on authentication and tools count
  const badgeText =
    !isAuthenticated || toolsCount === undefined ? '0 active' : `${toolsCount} active`;

  const lockIcon = isLoading ? (
    <Spinner size="sm" />
  ) : isAuthenticated ? (
    <UnlockIcon color="var(--pf-t--global--color--status--custom--default)" />
  ) : (
    <LockIcon />
  );

  return (
    <Tr className="pf-v6-m-compact">
      <CheckboxTd
        textCenter
        className="pf-v6-u-align-content-center pf-v6-u-py-sm"
        id={server.id}
        isChecked={isChecked}
        onToggle={onToggleCheck}
        isDisabled={false}
        data-testid={`mcp-server-checkbox-${server.id}`}
      />
      <Td dataLabel="Name" className="pf-v6-u-align-content-center pf-v6-u-py-sm">
        <Truncate content={server.name} />
      </Td>

      <Td dataLabel="Tools" className="pf-v6-u-align-content-center pf-v6-u-py-sm">
        <Tooltip content={disableToolIcon ? 'Auth required to list tools.' : 'View tools'}>
          <Button
            variant="plain"
            onClick={onToolsClick}
            aria-label={`View tools for ${server.name}`}
            data-testid={`mcp-server-tools-button-${server.id}`}
            className="pf-v6-u-p-xs pf-v6-u-min-height-auto"
            isAriaDisabled={disableToolIcon}
          >
            {isFetchingTools ? (
              <Spinner size="sm" />
            ) : (
              <Badge isRead className="pf-v6-u-font-weight-normal">
                {badgeText}
              </Badge>
            )}
          </Button>
        </Tooltip>
      </Td>
      <Td
        dataLabel="Actions"
        className="pf-v6-u-align-items-center pf-v6-u-text-align-right pf-v6-u-pr-md pf-v6-u-py-sm"
      >
        <Button
          variant="plain"
          icon={lockIcon}
          onClick={onLockClick}
          aria-label={`Configure ${server.name}`}
          data-testid={`mcp-server-configure-button-${server.id}`}
          className="pf-v6-u-p-xs"
          isDisabled={isLoading}
        />
      </Td>
    </Tr>
  );
};

export default MCPServerPanelRow;
