import * as React from 'react';
import {
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  SearchInput,
  // eslint-disable-next-line no-restricted-imports -- custom toggle with Badge count and Divider separators between option groups; wrapper components (MultiSelection, SimpleSelect) do not support this layout
  Select,
  Divider,
  SelectList,
  SelectOption,
  Switch,
  ToolbarFilter,
  ToolbarGroup,
  ToolbarItem,
  Badge,
} from '@patternfly/react-core';
import { FilterIcon } from '@patternfly/react-icons';
import { PERMISSION_OPTIONS } from './const';
import type { GroupedProjectOptions } from './useConnectedWorkbenchFilters';

const FILTER_TYPES = {
  workbenchName: 'Workbench name',
  authorizedProject: 'Authorized project',
  permission: 'Permission',
} satisfies Record<string, string>;

type FilterType = keyof typeof FILTER_TYPES;

const isFilterType = (key: string): key is FilterType => key in FILTER_TYPES;

const FILTER_TYPE_KEYS = Object.keys(FILTER_TYPES).filter(isFilterType);

type ConnectedWorkbenchesToolbarProps = {
  workbenchNameFilter: string;
  selectedProjects: string[];
  selectedPermissions: string[];
  hideProjectsWithConnectedWorkbenches: boolean;
  projectOptions: GroupedProjectOptions;
  onWorkbenchNameFilterChange: (value: string) => void;
  onProjectToggle: (project: string) => void;
  onPermissionToggle: (permission: string) => void;
  onHideProjectsWithConnectedWorkbenchesChange: (hide: boolean) => void;
};

const ConnectedWorkbenchesToolbar: React.FC<ConnectedWorkbenchesToolbarProps> = ({
  workbenchNameFilter,
  selectedProjects,
  selectedPermissions,
  hideProjectsWithConnectedWorkbenches,
  projectOptions,
  onWorkbenchNameFilterChange,
  onProjectToggle,
  onPermissionToggle,
  onHideProjectsWithConnectedWorkbenchesChange,
}) => {
  const [currentFilterType, setCurrentFilterType] = React.useState<FilterType>('authorizedProject');
  const [isFilterTypeOpen, setIsFilterTypeOpen] = React.useState(false);
  const [isProjectSelectOpen, setIsProjectSelectOpen] = React.useState(false);
  const [isPermissionSelectOpen, setIsPermissionSelectOpen] = React.useState(false);

  const hasProjectOptions =
    projectOptions.withConnected.length > 0 || projectOptions.withoutConnected.length > 0;

  return (
    <ToolbarGroup variant="filter-group" data-testid="connected-workbenches-filter-toolbar">
      <ToolbarItem>
        <Dropdown
          onOpenChange={setIsFilterTypeOpen}
          shouldFocusToggleOnSelect
          toggle={(toggleRef) => (
            <MenuToggle
              ref={toggleRef}
              data-testid="filter-type-toggle"
              onClick={() => setIsFilterTypeOpen((prev) => !prev)}
              isExpanded={isFilterTypeOpen}
              icon={<FilterIcon />}
            >
              {FILTER_TYPES[currentFilterType]}
            </MenuToggle>
          )}
          isOpen={isFilterTypeOpen}
          popperProps={{ appendTo: () => document.body }}
        >
          <DropdownList>
            {FILTER_TYPE_KEYS.map((filterType) => (
              <DropdownItem
                key={filterType}
                data-testid={`filter-type-option-${filterType}`}
                onClick={() => {
                  setIsFilterTypeOpen(false);
                  setCurrentFilterType(filterType);
                }}
              >
                {FILTER_TYPES[filterType]}
              </DropdownItem>
            ))}
          </DropdownList>
        </Dropdown>
      </ToolbarItem>

      <ToolbarFilter
        labels={
          workbenchNameFilter
            ? [
                {
                  key: 'workbench-name',
                  node: <span data-testid="workbench-name-filter-chip">{workbenchNameFilter}</span>,
                },
              ]
            : []
        }
        deleteLabel={() => onWorkbenchNameFilterChange('')}
        categoryName="Workbench name"
        showToolbarItem={currentFilterType === 'workbenchName'}
      >
        <SearchInput
          aria-label="Find by workbench name"
          placeholder="Find by workbench name"
          data-testid="workbench-name-filter-input"
          value={workbenchNameFilter}
          onChange={(_event, value) => onWorkbenchNameFilterChange(value)}
          onClear={() => onWorkbenchNameFilterChange('')}
        />
      </ToolbarFilter>

      <ToolbarFilter
        labels={selectedProjects.map((p) => ({
          key: p,
          node: <span data-testid={`project-filter-chip-${p}`}>{p}</span>,
        }))}
        deleteLabel={(_category, label) => {
          const key = typeof label === 'string' ? label : label.key;
          onProjectToggle(key);
        }}
        categoryName="Authorized project"
        showToolbarItem={currentFilterType === 'authorizedProject'}
      >
        <Select
          aria-label="Filter by authorized project"
          isOpen={isProjectSelectOpen}
          selected={selectedProjects}
          onSelect={(_event, value) => {
            if (typeof value === 'string') {
              onProjectToggle(value);
            }
          }}
          onOpenChange={setIsProjectSelectOpen}
          toggle={(toggleRef) => (
            <MenuToggle
              ref={toggleRef}
              data-testid="project-filter-toggle"
              onClick={() => setIsProjectSelectOpen((prev) => !prev)}
              isExpanded={isProjectSelectOpen}
              isDisabled={!hasProjectOptions}
            >
              Filter by a project name
              {selectedProjects.length > 0 ? (
                <Badge isRead data-testid="project-filter-badge">
                  {selectedProjects.length}
                </Badge>
              ) : null}
            </MenuToggle>
          )}
          popperProps={{ appendTo: () => document.body }}
        >
          <SelectList isAriaMultiselectable>
            {projectOptions.withConnected.length > 0 ? (
              <>
                <SelectOption
                  isDisabled
                  value="header-with-connected"
                  data-testid="project-group-header-with"
                >
                  Projects with connected workbenches
                </SelectOption>
                {projectOptions.withConnected.map((project) => (
                  <SelectOption
                    key={project}
                    value={project}
                    isSelected={selectedProjects.includes(project)}
                    data-testid={`project-option-${project}`}
                  >
                    {project}
                  </SelectOption>
                ))}
              </>
            ) : null}
            {projectOptions.withConnected.length > 0 &&
            projectOptions.withoutConnected.length > 0 ? (
              <Divider />
            ) : null}
            {projectOptions.withoutConnected.length > 0 ? (
              <>
                <SelectOption
                  isDisabled
                  value="header-without-connected"
                  data-testid="project-group-header-without"
                >
                  Projects without connected workbenches
                </SelectOption>
                {projectOptions.withoutConnected.map((project) => (
                  <SelectOption
                    key={project}
                    value={project}
                    isSelected={selectedProjects.includes(project)}
                    data-testid={`project-option-${project}`}
                  >
                    {project}
                  </SelectOption>
                ))}
              </>
            ) : null}
          </SelectList>
        </Select>
      </ToolbarFilter>

      <ToolbarFilter
        labels={selectedPermissions.map((p) => ({
          key: p,
          node: <span data-testid={`permission-filter-chip-${p}`}>{p}</span>,
        }))}
        deleteLabel={(_category, label) => {
          const key = typeof label === 'string' ? label : label.key;
          onPermissionToggle(key);
        }}
        categoryName="Permission"
        showToolbarItem={currentFilterType === 'permission'}
      >
        <Select
          aria-label="Filter by permission"
          isOpen={isPermissionSelectOpen}
          selected={selectedPermissions}
          onSelect={(_event, value) => {
            if (typeof value === 'string') {
              onPermissionToggle(value);
            }
          }}
          onOpenChange={setIsPermissionSelectOpen}
          toggle={(toggleRef) => (
            <MenuToggle
              ref={toggleRef}
              data-testid="permission-filter-toggle"
              onClick={() => setIsPermissionSelectOpen((prev) => !prev)}
              isExpanded={isPermissionSelectOpen}
            >
              Filter by permission
              {selectedPermissions.length > 0 ? (
                <Badge isRead data-testid="permission-filter-badge">
                  {selectedPermissions.length}
                </Badge>
              ) : null}
            </MenuToggle>
          )}
          popperProps={{ appendTo: () => document.body }}
        >
          <SelectList isAriaMultiselectable>
            {PERMISSION_OPTIONS.map((permission) => (
              <SelectOption
                key={permission}
                value={permission}
                hasCheckbox
                isSelected={selectedPermissions.includes(permission)}
                data-testid={`permission-option-${permission}`}
              >
                {permission}
              </SelectOption>
            ))}
          </SelectList>
        </Select>
      </ToolbarFilter>

      <ToolbarItem alignSelf="center">
        <Switch
          id="hide-projects-with-connected-workbenches"
          label="Hide projects with connected workbenches"
          isChecked={hideProjectsWithConnectedWorkbenches}
          onChange={(_event, checked) => onHideProjectsWithConnectedWorkbenchesChange(checked)}
          data-testid="hide-connected-workbenches-switch"
        />
      </ToolbarItem>
    </ToolbarGroup>
  );
};

export default ConnectedWorkbenchesToolbar;
