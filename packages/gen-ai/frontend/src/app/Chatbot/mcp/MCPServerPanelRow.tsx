import * as React from 'react';
import { Truncate, Button } from '@patternfly/react-core';
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
  isValidated?: boolean;
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
  isValidated = false,
  isLoading = false,
  isStatusLoading = false,
  isAuthenticated = false,
}) => {
  const lockIcon = isValidated ? (
    <UnlockIcon color="var(--pf-t--global--color--status--custom--default)" />
  ) : (
    <LockIcon />
  );

  return (
    <Tr className="pf-v6-m-compact">
      <Td dataLabel="Name" className="pf-v6-u-align-content-center pf-v6-u-py-sm">
        <Truncate content={server.name} />
      </Td>
      <CheckboxTd
        textCenter
        className="pf-v6-u-align-content-center pf-v6-u-py-sm"
        id={server.id}
        isChecked={isChecked}
        onToggle={onToggleCheck}
        isDisabled={false}
      />
      <Td dataLabel="Tools" className="pf-v6-u-align-content-center pf-v6-u-py-sm">
        <Button
          variant="plain"
          onClick={onToolsClick}
          aria-label={`View tools for ${server.name}`}
          className="pf-v6-u-p-xs pf-v6-u-min-height-auto"
          isDisabled={isLoading || isStatusLoading || !isAuthenticated}
        >
          <ScrewWrenchIcon className="pf-v6-u-w-sm pf-v6-u-h-sm" />
        </Button>
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
