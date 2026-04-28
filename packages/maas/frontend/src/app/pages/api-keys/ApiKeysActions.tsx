import * as React from 'react';
import { Dropdown, DropdownItem, MenuToggle, DropdownList } from '@patternfly/react-core';
import { EllipsisVIcon } from '@patternfly/react-icons';
import RevokeAllApiKeysModal from './RevokeAllApiKeysModal';
import AdminRevokeAllApiKeysModal from './AdminRevokeAllApiKeysModal';

type ApiKeysActionsProps = {
  apiKeyCount: number;
  isMaasAdmin: boolean;
  onRefresh?: () => void;
};

const ApiKeysActions: React.FC<ApiKeysActionsProps> = ({ apiKeyCount, isMaasAdmin, onRefresh }) => {
  const [open, setOpen] = React.useState(false);
  const [revokeAllOpen, setRevokeAllOpen] = React.useState(false);

  const handleRevokeClose = React.useCallback(
    (revoked: boolean) => {
      setRevokeAllOpen(false);
      if (revoked && onRefresh) {
        onRefresh();
      }
    },
    [onRefresh],
  );

  return (
    <>
      <Dropdown
        onOpenChange={setOpen}
        onSelect={() => setOpen(false)}
        toggle={(toggleRef) => (
          <MenuToggle
            aria-label="Actions"
            data-testid="api-keys-actions"
            variant="plain"
            ref={toggleRef}
            onClick={() => setOpen(!open)}
          >
            <EllipsisVIcon />
          </MenuToggle>
        )}
        isOpen={open}
      >
        <DropdownList>
          <DropdownItem
            data-testid="revoke-all-api-keys-action"
            onClick={() => setRevokeAllOpen(true)}
            isDisabled={!isMaasAdmin && apiKeyCount === 0}
            isDanger
          >
            {isMaasAdmin ? 'Revoke user API keys' : 'Revoke all my keys'}
          </DropdownItem>
        </DropdownList>
      </Dropdown>
      {revokeAllOpen &&
        (isMaasAdmin ? (
          <AdminRevokeAllApiKeysModal onClose={handleRevokeClose} />
        ) : (
          <RevokeAllApiKeysModal onClose={handleRevokeClose} />
        ))}
    </>
  );
};

export default ApiKeysActions;
