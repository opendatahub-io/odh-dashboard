import * as React from 'react';
import { HelperText, HelperTextItem, MenuItem } from '@patternfly/react-core';
import SearchSelector from '@odh-dashboard/internal/components/searchSelector/SearchSelector';
import { useNamespaceSelector } from 'mod-arch-core';

interface ProjectDropdownProps {
  selectedProject?: string;
  onProjectChange: (projectName: string) => void;
  onProjectsLoaded: (projects: string[]) => void;
  isDisabled?: boolean;
}

const ProjectDropdown: React.FC<ProjectDropdownProps> = ({
  selectedProject,
  onProjectChange,
  onProjectsLoaded,
  isDisabled = false,
}) => {
  const { namespaces, namespacesLoaded, namespacesLoadError } = useNamespaceSelector();
  const [searchText, setSearchText] = React.useState('');

  // Extract namespace names and convert to project names
  const availableProjects = React.useMemo(() => {
    if (namespaces.length === 0) {
      return [];
    }
    return namespaces
      .map((namespace) => namespace.name)
      .filter((name): name is string => !!name)
      .toSorted();
  }, [namespaces]);

  // Notify parent component when projects are loaded
  React.useEffect(() => {
    if (namespacesLoaded && availableProjects.length > 0) {
      onProjectsLoaded(availableProjects);
    }
  }, [namespacesLoaded, availableProjects, onProjectsLoaded]);

  // Filter projects based on search text
  const bySearchText = React.useCallback(
    (projectName: string) =>
      !searchText || projectName.toLowerCase().includes(searchText.toLowerCase()),
    [searchText],
  );

  const filteredProjects = availableProjects.filter(bySearchText);

  let toggleLabel = selectedProject || 'Select a project';
  if (!namespacesLoaded) {
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
        isLoading={!namespacesLoaded}
        isDisabled={isDisabled || !namespacesLoaded}
        toggleContent={toggleLabel}
      >
        <>
          {!namespacesLoaded && <MenuItem isDisabled>Loading projects...</MenuItem>}
          {namespacesLoaded && filteredProjects.length === 0 && (
            <MenuItem isDisabled>No projects available</MenuItem>
          )}
          {namespacesLoaded &&
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
