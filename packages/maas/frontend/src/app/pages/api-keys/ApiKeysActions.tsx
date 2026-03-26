import * as React from 'react';
import { Dropdown, DropdownItem, MenuToggle, DropdownList } from '@patternfly/react-core';
import { EllipsisVIcon } from '@patternfly/react-icons';
import RevokeAllApiKeysModal from './RevokeAllApiKeysModal';

type ApiKeysActionsProps = {
  apiKeyCount: number;
  onRefresh?: () => void;
};

const ApiKeysActions: React.FC<ApiKeysActionsProps> = ({ apiKeyCount, onRefresh }) => {
  const [open, setOpen] = React.useState(false);
  const [revokeAllOpen, setRevokeAllOpen] = React.useState(false);

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
            isDisabled={apiKeyCount === 0}
            isDanger
          >
            Revoke all my keys
          </DropdownItem>
        </DropdownList>
      </Dropdown>
      {revokeAllOpen && (
        <RevokeAllApiKeysModal
          onClose={(revoked) => {
            setRevokeAllOpen(false);
            if (revoked && onRefresh) {
              onRefresh();
            }
          }}
        />
      )}
    </>
  );
};

export default ApiKeysActions;
