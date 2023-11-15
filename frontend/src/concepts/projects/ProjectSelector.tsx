import * as React from 'react';
import { Dropdown, DropdownItem, DropdownToggle } from '@patternfly/react-core';
import { getProjectDisplayName } from '~/pages/projects/utils';
import { byName, ProjectsContext } from '~/concepts/projects/ProjectsContext';
import useMountProjectRefresh from '~/concepts/projects/useMountProjectRefresh';

type ProjectSelectorProps = {
  onSelection: (projectName: string) => void;
  namespace: string;
  invalidDropdownPlaceholder?: string;
  selectAllProjects?: boolean;
  primary?: boolean;
  filterLabel?: string;
};

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  onSelection,
  namespace,
  invalidDropdownPlaceholder,
  selectAllProjects,
  primary,
  filterLabel,
}) => {
  const { projects, updatePreferredProject } = React.useContext(ProjectsContext);
  useMountProjectRefresh();
  const selection = projects.find(byName(namespace));
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  const selectionDisplayName = selection
    ? getProjectDisplayName(selection)
    : invalidDropdownPlaceholder ?? namespace;

  const filteredProjects = filterLabel
    ? projects.filter((project) => project.metadata.labels[filterLabel] !== undefined)
    : projects;

  return (
    <Dropdown
      toggle={
        <DropdownToggle
          isDisabled={projects.length === 0}
          onToggle={() => setDropdownOpen(!dropdownOpen)}
          toggleVariant={primary ? 'primary' : undefined}
        >
          {projects.length === 0 ? 'No projects' : selectionDisplayName}
        </DropdownToggle>
      }
      isOpen={dropdownOpen}
      dropdownItems={[
        ...(selectAllProjects
          ? [
              <DropdownItem
                key={'all-projects'}
                onClick={() => {
                  setDropdownOpen(false);
                  onSelection('');
                  updatePreferredProject(null);
                }}
              >
                All projects
              </DropdownItem>,
            ]
          : []),
        ...filteredProjects.map((project) => (
          <DropdownItem
            key={project.metadata.name}
            onClick={() => {
              setDropdownOpen(false);
              onSelection(project.metadata.name);
            }}
          >
            {getProjectDisplayName(project)}
          </DropdownItem>
        )),
      ]}
    />
  );
};

export default ProjectSelector;
