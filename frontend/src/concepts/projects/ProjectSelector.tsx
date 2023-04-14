import * as React from 'react';
import { Dropdown, DropdownItem, DropdownToggle } from '@patternfly/react-core';
import { useNavigate, useParams } from 'react-router-dom';
import { getProjectDisplayName } from '~/pages/projects/utils';
import { byName, ProjectsContext } from '~/concepts/projects/ProjectsContext';
import useMountProjectRefresh from '~/concepts/projects/useMountProjectRefresh';

type ProjectSelectorProps = {
  invalidDropdownPlaceholder?: string;
  getRedirectPath: (namespace: string) => string;
  primary?: boolean;
};

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  getRedirectPath,
  invalidDropdownPlaceholder,
  primary,
}) => {
  const { projects } = React.useContext(ProjectsContext);
  useMountProjectRefresh();
  const { namespace } = useParams();
  const navigate = useNavigate();
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
            navigate(getRedirectPath(project.metadata.name));
            setDropdownOpen(false);
          }}
        >
          {getProjectDisplayName(project)}
        </DropdownItem>
      ))}
    />
  );
};

export default ProjectSelector;
