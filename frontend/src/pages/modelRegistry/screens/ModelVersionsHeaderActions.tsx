import * as React from 'react';
import {
  Dropdown,
  DropdownList,
  MenuToggle,
  MenuToggleAction,
  DropdownItem,
} from '@patternfly/react-core';

const ModelVersionsHeaderActions: React.FC = () => {
  const [isOpen, setOpen] = React.useState(false);
  const tooltipRef = React.useRef<HTMLButtonElement>(null);

  return (
    <>
      <Dropdown
        isOpen={isOpen}
        onSelect={() => setOpen(false)}
        onOpenChange={(open) => setOpen(open)}
        toggle={(toggleRef) => (
          <MenuToggle
            variant="primary"
            ref={toggleRef}
            onClick={() => setOpen(!isOpen)}
            isExpanded={isOpen}
            splitButtonOptions={{
              variant: 'action',
              items: [
                <MenuToggleAction
                  id="register-model-button"
                  key="register-model-button"
                  data-testid="register-model-button"
                  aria-label="Register model"
                  onClick={() => undefined}
                >
                  Actions
                </MenuToggleAction>,
              ],
            }}
            aria-label="Model version action toggle"
            data-testid="model-version-split-button"
          />
        )}
      >
        <DropdownList>
          <DropdownItem
            id="archive-model-button"
            aria-label="Archive model"
            key="archive-model-button"
            onClick={() => undefined}
            ref={tooltipRef}
            isDisabled // This feature is currently disabled but will be enabled in a future PR post-summit release.
          >
            Archive model
          </DropdownItem>
        </DropdownList>
      </Dropdown>
    </>
  );
};

export default ModelVersionsHeaderActions;
