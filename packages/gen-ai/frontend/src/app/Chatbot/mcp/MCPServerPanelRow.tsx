import * as React from 'react';
import { Truncate, Button, Tooltip, Spinner } from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';
import { LockIcon, UnlockIcon } from '@patternfly/react-icons';
import { CheckboxTd } from 'mod-arch-shared';
import ScrewWrenchIcon from '@odh-dashboard/internal/images/icons/ScrewWrenchIcon';
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
}) => {
  const disableToolIcon = isLoading || isStatusLoading || !isAuthenticated;

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
            className="pf-v6-u-p-xs pf-v6-u-min-height-auto"
            isAriaDisabled={disableToolIcon}
          >
            <ScrewWrenchIcon className="pf-v6-u-w-sm pf-v6-u-h-sm" />
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
          className="pf-v6-u-p-xs"
          isDisabled={isLoading}
        />
      </Td>
    </Tr>
  );
};

export default MCPServerPanelRow;
