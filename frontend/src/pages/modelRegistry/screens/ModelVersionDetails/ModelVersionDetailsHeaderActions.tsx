import * as React from 'react';
import { Dropdown, DropdownList, MenuToggle, DropdownItem } from '@patternfly/react-core';

const ModelVersionsDetailsHeaderActions: React.FC = () => {
  const [isOpenActionDropdown, setOpenActionDropdown] = React.useState(false);
  const tooltipRef = React.useRef<HTMLButtonElement>(null);

  return (
    <Dropdown
      isOpen={isOpenActionDropdown}
      onSelect={() => setOpenActionDropdown(false)}
      onOpenChange={(open) => setOpenActionDropdown(open)}
      toggle={(toggleRef) => (
        <MenuToggle
          variant="primary"
          ref={toggleRef}
          onClick={() => setOpenActionDropdown(!isOpenActionDropdown)}
          isExpanded={isOpenActionDropdown}
          aria-label="Model version details action toggle"
          data-testid="model-version-details-action-button"
        >
          Actions
        </MenuToggle>
      )}
    >
      <DropdownList>
        <DropdownItem
          id="deploy-button"
          aria-label="Deploy version"
          key="deploy-button"
          onClick={() => undefined}
          ref={tooltipRef}
          isDisabled // TODO This feature is currently disabled but will be enabled in a future PR post-summit release.
        >
          Deploy
        </DropdownItem>
        <DropdownItem
          id="archive-version-button"
          aria-label="Archive version"
          key="archive-version-button"
          onClick={() => undefined}
          ref={tooltipRef}
          isDisabled // TODO This feature is currently disabled but will be enabled in a future PR post-summit release.
        >
          Archive version
        </DropdownItem>
      </DropdownList>
    </Dropdown>
  );
};

export default ModelVersionsDetailsHeaderActions;
