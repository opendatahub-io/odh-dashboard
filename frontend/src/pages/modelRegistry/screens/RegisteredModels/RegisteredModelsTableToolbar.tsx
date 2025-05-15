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
import { useNavigate } from 'react-router';
import { registerModelRoute, registerVersionRoute } from '~/routes/modelRegistry/register';
import { registeredModelArchiveRoute } from '~/routes/modelRegistry/modelArchive';
import { ModelRegistrySelectorContext } from '~/concepts/modelRegistry/context/ModelRegistrySelectorContext';

type RegisteredModelsTableToolbarProps = {
  toggleGroupItems?: React.ReactNode;
  onClearAllFilters?: () => void;
};

const RegisteredModelsTableToolbar: React.FC<RegisteredModelsTableToolbarProps> = ({
  toggleGroupItems: tableToggleGroupItems,
  onClearAllFilters,
}) => {
  const navigate = useNavigate();
  const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);
  const [isRegisterNewVersionOpen, setIsRegisterNewVersionOpen] = React.useState(false);
  const [isArchivedModelKebabOpen, setIsArchivedModelKebabOpen] = React.useState(false);

  const tooltipRef = React.useRef<HTMLButtonElement>(null);

  return (
    <Toolbar data-testid="registered-models-table-toolbar" clearAllFilters={onClearAllFilters}>
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
                splitButtonItems={[
                  <MenuToggleAction
                    id="register-model-button"
                    key="register-model-button"
                    data-testid="register-model-button"
                    aria-label="Register model"
                    onClick={() =>
                      navigate(registerModelRoute(preferredModelRegistry?.metadata.name))
                    }
                  >
                    Register model
                  </MenuToggleAction>,
                ]}
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
                onClick={() => {
                  navigate(registerVersionRoute(preferredModelRegistry?.metadata.name));
                }}
                ref={tooltipRef}
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
                data-testid="registered-models-table-kebab-action"
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
              <DropdownItem
                onClick={() =>
                  navigate(registeredModelArchiveRoute(preferredModelRegistry?.metadata.name))
                }
              >
                View archived models
              </DropdownItem>
            </DropdownList>
          </Dropdown>
        </ToolbarItem>
      </ToolbarContent>
    </Toolbar>
  );
};

export default RegisteredModelsTableToolbar;
