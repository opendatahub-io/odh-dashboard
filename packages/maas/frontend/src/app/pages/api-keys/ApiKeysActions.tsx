import * as React from 'react';
import { Dropdown, DropdownItem, MenuToggle, DropdownList } from '@patternfly/react-core';
import RevokeAllApiKeysModal from './RevokeAllApiKeysModal';

type ApiKeysActionsProps = {
  apiKeyCount: number;
};

const ApiKeysActions: React.FC<ApiKeysActionsProps> = ({ apiKeyCount }) => {
  const [open, setOpen] = React.useState(false);
  const [revokeAllOpen, setRevokeAllOpen] = React.useState(false);

  const DropdownComponent = (
    <Dropdown
      onOpenChange={setOpen}
      onSelect={() => setOpen(false)}
      toggle={(toggleRef) => (
        <MenuToggle
          aria-label="Actions"
          data-testid="api-keys-actions"
          variant="secondary"
          ref={toggleRef}
          onClick={() => {
            setOpen(!open);
          }}
        >
          Actions
        </MenuToggle>
      )}
      isOpen={open}
      popperProps={{ position: 'right' }}
    >
      <DropdownList>
        <DropdownItem
          data-testid="revoke-all-api-keys-action"
          onClick={() => setRevokeAllOpen(true)}
        >
          Revoke all API keys
        </DropdownItem>
      </DropdownList>
    </Dropdown>
  );

  return (
    <>
      {DropdownComponent}
      {revokeAllOpen ? (
        <RevokeAllApiKeysModal
          apiKeyCount={apiKeyCount}
          onClose={() => {
            setRevokeAllOpen(false);
          }}
        />
      ) : null}
    </>
  );
};

export default ApiKeysActions;
