import * as React from 'react';
import { Divider, MenuGroup, MenuItem, Flex, FlexItem } from '@patternfly/react-core';
import { ProjectObjectType } from '~/concepts/design/utils';
import SearchSelector from '~/components/searchSelector/SearchSelector';
import ScopedLabel, { ScopedLabelColor } from '~/components/ScopedLabel';
import TypedObjectIcon from '~/concepts/design/TypedObjectIcon';
import GlobalIcon from '~/images/icons/GlobalIcon';

type WithNamespace = { metadata: { namespace: string } };

export type ProjectScopedSearchDropdownProps<T> = {
  projectScopedItems: T[];
  globalScopedItems: T[];
  renderMenuItem: (item: T, index: number, scope: 'project' | 'global') => React.ReactNode;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchClear: () => void;
  toggleContent: React.ReactNode;
  extraMenuItems?: React.ReactNode;
  loading?: boolean;
  projectGroupLabel?: React.ReactNode;
  globalGroupLabel?: React.ReactNode;
  dataTestId?: string;
  projectGroupTestId?: string;
  globalGroupTestId?: string;
  isFullWidth?: boolean;
  isDisabled?: boolean;
  minWidth?: string;
};

export type ProjectScopedToggleLabelProps<T extends WithNamespace> = {
  selectedItem?: T;
  currentProject?: string;
  getDisplayName: (item: T) => string;
  projectLabel?: string;
  globalLabel?: string;
  isEditing?: boolean;
  style?: React.CSSProperties;
  color?: ScopedLabelColor;
  isCompact?: boolean;
};

export type ProjectScopedGroupLabelProps = {
  isProject: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
};

function ProjectScopedGroupLabel({
  isProject,
  children,
  style,
}: ProjectScopedGroupLabelProps): JSX.Element {
  return (
    <Flex
      spaceItems={{ default: 'spaceItemsXs' }}
      alignItems={{ default: 'alignItemsCenter' }}
      style={{ paddingBottom: '5px', ...style }}
    >
      <FlexItem style={{ display: 'flex', paddingLeft: '12px' }}>
        {isProject ? (
          <TypedObjectIcon
            style={{ height: '12px', width: '12px' }}
            alt=""
            resourceType={ProjectObjectType.project}
          />
        ) : (
          <GlobalIcon style={{ height: '12px', width: '12px' }} />
        )}
      </FlexItem>
      <FlexItem>{children}</FlexItem>
    </Flex>
  );
}

function ProjectScopedToggleLabel<T extends WithNamespace>({
  selectedItem,
  currentProject,
  getDisplayName,
  projectLabel = 'Project-scoped',
  globalLabel = 'Global-scoped',
  isEditing,
  style,
  color = 'blue',
  isCompact = true,
}: ProjectScopedToggleLabelProps<T>): JSX.Element | null {
  if (!selectedItem) {
    return null;
  }
  const isProject = selectedItem.metadata.namespace === currentProject;
  return (
    <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
      <FlexItem>{getDisplayName(selectedItem)}</FlexItem>
      <FlexItem>
        <ScopedLabel
          isProject={isProject}
          variant={isEditing ? 'filled' : 'outline'}
          color={isEditing ? 'grey' : color}
          isCompact={isCompact}
          style={style}
        >
          {isProject ? projectLabel : globalLabel}
        </ScopedLabel>
      </FlexItem>
    </Flex>
  );
}

function ProjectScopedSearchDropdown<T>({
  projectScopedItems,
  globalScopedItems,
  renderMenuItem,
  searchValue,
  onSearchChange,
  onSearchClear,
  toggleContent,
  extraMenuItems,
  loading,
  projectGroupLabel,
  globalGroupLabel,
  dataTestId = 'project-scoped-search-dropdown',
  projectGroupTestId,
  globalGroupTestId,
  isFullWidth,
  isDisabled,
  minWidth,
}: ProjectScopedSearchDropdownProps<T>): JSX.Element {
  return (
    <SearchSelector
      dataTestId={dataTestId}
      isFullWidth={isFullWidth}
      isDisabled={isDisabled}
      minWidth={minWidth}
      isLoading={loading}
      onSearchChange={onSearchChange}
      onSearchClear={onSearchClear}
      searchValue={searchValue}
      toggleContent={toggleContent}
    >
      <>
        {projectScopedItems.length > 0 && (
          <MenuGroup
            label={
              projectGroupLabel ?? (
                <ProjectScopedGroupLabel isProject>Project-scoped</ProjectScopedGroupLabel>
              )
            }
            data-testid={projectGroupTestId}
          >
            {projectScopedItems.map((item, idx) => renderMenuItem(item, idx, 'project'))}
          </MenuGroup>
        )}
        {projectScopedItems.length > 0 && globalScopedItems.length > 0 && (
          <Divider component="li" />
        )}
        {globalScopedItems.length > 0 && (
          <MenuGroup
            label={
              globalGroupLabel ?? (
                <ProjectScopedGroupLabel isProject={false}>Global-scoped</ProjectScopedGroupLabel>
              )
            }
            data-testid={globalGroupTestId}
          >
            {globalScopedItems.map((item, idx) => renderMenuItem(item, idx, 'global'))}
          </MenuGroup>
        )}
        {extraMenuItems}
        {projectScopedItems.length === 0 && globalScopedItems.length === 0 && (
          <MenuItem isDisabled>No results found</MenuItem>
        )}
      </>
    </SearchSelector>
  );
}

export { ProjectScopedSearchDropdown, ProjectScopedToggleLabel, ProjectScopedGroupLabel };
