import * as React from 'react';
import { HelperText, HelperTextItem, MenuItem } from '@patternfly/react-core';
import SearchSelector from '@odh-dashboard/internal/components/searchSelector/SearchSelector';
import { useGenAiProjects } from '~/app/context';

interface ProjectDropdownProps {
  onProjectChange: (projectName: string) => void;
  isDisabled?: boolean;
}

const ProjectDropdown: React.FC<ProjectDropdownProps> = ({
  onProjectChange,
  isDisabled = false,
}) => {
  const [searchText, setSearchText] = React.useState('');
  const {
    selectedProject,
    availableProjects,
    isLoading,
    error: namespacesLoadError,
  } = useGenAiProjects();

  const bySearchText = React.useCallback(
    (projectName: string) =>
      !searchText || projectName.toLowerCase().includes(searchText.toLowerCase()),
    [searchText],
  );

  const filteredProjects = availableProjects.filter(bySearchText);

  let toggleLabel = selectedProject || 'Select a project';
  if (isLoading) {
    toggleLabel = 'Loading...';
  }
  if (namespacesLoadError) {
    toggleLabel = 'Error fetching projects';
  }

  return (
    <>
      <SearchSelector
        dataTestId="ai-playground-project-selector"
        minWidth="300px"
        onSearchChange={(value: string) => setSearchText(value)}
        onSearchClear={() => setSearchText('')}
        searchFocusOnOpen
        searchPlaceholder="Search projects..."
        searchValue={searchText}
        isLoading={isLoading}
        isDisabled={isDisabled || isLoading}
        toggleContent={toggleLabel}
      >
        <>
          {isLoading && <MenuItem isDisabled>Loading projects...</MenuItem>}
          {!isLoading && filteredProjects.length === 0 && (
            <MenuItem isDisabled>No projects available</MenuItem>
          )}
          {!isLoading &&
            filteredProjects.map((projectName) => (
              <MenuItem
                key={projectName}
                isSelected={projectName === selectedProject}
                onClick={() => {
                  setSearchText('');
                  onProjectChange(projectName);
                }}
              >
                {projectName}
              </MenuItem>
            ))}
        </>
      </SearchSelector>
      {namespacesLoadError && (
        <HelperText>
          <HelperTextItem variant="error">
            {namespacesLoadError.message || 'Error loading namespaces'}
          </HelperTextItem>
        </HelperText>
      )}
    </>
  );
};

export default ProjectDropdown;
