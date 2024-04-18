import * as React from 'react';
import {
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleAction,
  MenuToggleElement,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  ToolbarToggleGroup,
} from '@patternfly/react-core';
import { EllipsisVIcon, FilterIcon } from '@patternfly/react-icons';

type RegisteredModelsTableToolbarProps = {
  toggleGroupItems?: React.ReactNode;
};

const RegisteredModelsTableToolbar: React.FC<RegisteredModelsTableToolbarProps> = ({
  toggleGroupItems: tableToggleGroupItems,
}) => {
  const [isRegisterNewVersionOpen, setIsRegisterNewVersionOpen] = React.useState(false);
  const [isArchivedModelKebabOpen, setIsArchivedModelKebabOpen] = React.useState(false);

  const tooltipRef = React.useRef<HTMLButtonElement>(null);

  return (
    <Toolbar data-testid="registered-models-table-toolbar">
      <ToolbarContent>
        <ToolbarToggleGroup toggleIcon={<FilterIcon />} breakpoint="xl">
          {tableToggleGroupItems}
        </ToolbarToggleGroup>
        <ToolbarItem>
          <Dropdown
            isOpen={isRegisterNewVersionOpen}
            onSelect={() => setIsRegisterNewVersionOpen(false)}
            onOpenChange={(isOpen) => setIsRegisterNewVersionOpen(isOpen)}
            toggle={(toggleRef) => (
              <MenuToggle
                isFullWidth
                variant="primary"
                ref={toggleRef}
                onClick={() => setIsRegisterNewVersionOpen(!isRegisterNewVersionOpen)}
                isExpanded={isRegisterNewVersionOpen}
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
                      Register model
                    </MenuToggleAction>,
                  ],
                }}
                aria-label="Register model toggle"
                data-testid="register-model-split-button"
              />
            )}
          >
            <DropdownList>
              <DropdownItem
                id="register-new-version-button"
                aria-label="Register new version"
                key="register-new-version-button"
                onClick={() => undefined}
                ref={tooltipRef}
                isDisabled // This feature is currently disabled but will be enabled in a future PR post-summit release.
              >
                Register new version
              </DropdownItem>
            </DropdownList>
          </Dropdown>
        </ToolbarItem>
        <ToolbarItem>
          <Dropdown
            isOpen={isArchivedModelKebabOpen}
            onSelect={() => setIsArchivedModelKebabOpen(false)}
            onOpenChange={(isOpen: boolean) => setIsArchivedModelKebabOpen(isOpen)}
            toggle={(tr: React.Ref<MenuToggleElement>) => (
              <MenuToggle
                ref={tr}
                variant="plain"
                onClick={() => setIsArchivedModelKebabOpen(!isArchivedModelKebabOpen)}
                isExpanded={isArchivedModelKebabOpen}
                aria-label="View archived models"
              >
                <EllipsisVIcon />
              </MenuToggle>
            )}
            shouldFocusToggleOnSelect
          >
            <DropdownList>
              <DropdownItem isDisabled>View archived models</DropdownItem>
            </DropdownList>
          </Dropdown>
        </ToolbarItem>
      </ToolbarContent>
    </Toolbar>
  );
};

export default RegisteredModelsTableToolbar;
