import * as React from 'react';
import {
  Select,
  SelectOption,
  SelectList,
  MenuToggle,
  MenuSearch,
  MenuSearchInput,
  SearchInput,
} from '@patternfly/react-core';
import { k8sListResource, K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { ProjectModel } from '../models';

interface ProjectKind extends K8sResourceCommon {
  status?: {
    phase: string;
  };
}

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
  const [searchText, setSearchText] = React.useState('');
  const [isOpen, setIsOpen] = React.useState(false);
  const [availableProjects, setAvailableProjects] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      setError(null);
      try {
        const projects = await k8sListResource<ProjectKind>({
          model: ProjectModel,
        });
        const projectNames = projects.items
          .filter((p) => p.metadata && p.status?.phase === 'Active')
          .map(
            (p) => p.metadata?.annotations?.['openshift.io/display-name'] || p.metadata?.name || '',
          )
          .filter((name): name is string => !!name)
          .toSorted();
        setAvailableProjects(projectNames);
        onProjectsLoaded(projectNames);
      } catch (e) {
        if (e instanceof Error) {
          setError(e);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, [onProjectsLoaded]);

  // Filter projects based on search text
  const bySearchText = React.useCallback(
    (projectName: string) =>
      !searchText || projectName.toLowerCase().includes(searchText.toLowerCase()),
    [searchText],
  );

  const filteredProjects = availableProjects.filter(bySearchText);

  let toggleLabel = selectedProject || 'Select a project';
  if (loading) {
    toggleLabel = 'Loading...';
  }
  if (error) {
    toggleLabel = 'Error fetching projects';
  }

  const handleSelect = (
    _event: React.MouseEvent<Element, MouseEvent> | undefined,
    value: string | number | undefined,
  ) => {
    if (typeof value === 'string' && value !== '') {
      setSearchText('');
      onProjectChange(value);
    }
    setIsOpen(false);
  };

  if (error) {
    return <span style={{ color: 'red', marginLeft: '10px' }}>{error.message}</span>;
  }

  return (
    <Select
      isOpen={isOpen}
      selected={selectedProject}
      onSelect={handleSelect}
      onOpenChange={(nextOpen: boolean) => setIsOpen(nextOpen)}
      toggle={(toggleRef) => (
        <MenuToggle
          ref={toggleRef}
          onClick={() => setIsOpen(!isOpen)}
          isExpanded={isOpen}
          isDisabled={isDisabled || loading}
          style={{ width: '100%', minWidth: '300px' }}
          data-testid="ai-playground-project-selector"
        >
          {toggleLabel}
        </MenuToggle>
      )}
      shouldFocusToggleOnSelect
    >
      <MenuSearch>
        <MenuSearchInput>
          <SearchInput
            value={searchText}
            placeholder="Search projects..."
            onChange={(_event, value: string) => setSearchText(value)}
            onClear={() => setSearchText('')}
            autoFocus
          />
        </MenuSearchInput>
      </MenuSearch>
      <SelectList style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {loading && <SelectOption isDisabled>Loading projects...</SelectOption>}
        {!loading && filteredProjects.length === 0 && (
          <SelectOption isDisabled>No projects available</SelectOption>
        )}
        {!loading &&
          filteredProjects.map((projectName) => (
            <SelectOption
              key={projectName}
              value={projectName}
              isSelected={projectName === selectedProject}
            >
              {projectName}
            </SelectOption>
          ))}
      </SelectList>
    </Select>
  );
};

export default ProjectDropdown;
