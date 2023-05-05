import * as React from 'react';
import { Dropdown, DropdownItem, DropdownToggle } from '@patternfly/react-core';
import { getProjectDisplayName } from '~/pages/projects/utils';
import { byName, ProjectsContext } from '~/concepts/projects/ProjectsContext';
import useMountProjectRefresh from '~/concepts/projects/useMountProjectRefresh';
import { ProjectKind } from '~/k8sTypes';

type ProjectSelectorProps = {
  onSelection: (project: ProjectKind) => void;
  namespace: string;
  invalidDropdownPlaceholder?: string;
  primary?: boolean;
};

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  onSelection,
  namespace,
  invalidDropdownPlaceholder,
  primary,
}) => {
  const { projects } = React.useContext(ProjectsContext);
  useMountProjectRefresh();
  const selection = projects.find(byName(namespace));
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  const selectionDisplayName = selection
    ? getProjectDisplayName(selection)
    : invalidDropdownPlaceholder ?? namespace;

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
      dropdownItems={projects.map((project) => (
        <DropdownItem
          key={project.metadata.name}
          onClick={() => {
            setDropdownOpen(false);
            onSelection(project);
          }}
        >
          {getProjectDisplayName(project)}
        </DropdownItem>
      ))}
    />
  );
};

export default ProjectSelector;
