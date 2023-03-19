import * as React from 'react';
import {
  Bullseye,
  Dropdown,
  DropdownItem,
  DropdownToggle,
  Split,
  SplitItem,
} from '@patternfly/react-core';
import { useNavigate, useParams } from 'react-router-dom';
import { getProjectDisplayName } from '~/pages/projects/utils';
import { byName, ProjectsContext } from '~/concepts/projects/ProjectsContext';
import useMountProjectRefresh from '~/concepts/projects/useMountProjectRefresh';

type PipelineCoreProjectSelectorProps = {
  getRedirectPath: (namespace: string) => string;
};

const PipelineCoreProjectSelector: React.FC<PipelineCoreProjectSelectorProps> = ({
  getRedirectPath,
}) => {
  const { projects } = React.useContext(ProjectsContext);
  useMountProjectRefresh();
  const { namespace } = useParams();
  const navigate = useNavigate();
  const selection = projects.find(byName(namespace));
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  const selectionDisplayName = selection ? getProjectDisplayName(selection) : namespace;

  return (
    <Split hasGutter>
      <SplitItem>
        <Bullseye>Project</Bullseye>
      </SplitItem>
      <SplitItem>
        <Dropdown
          toggle={
            <DropdownToggle
              isDisabled={projects.length === 0}
              onToggle={() => setDropdownOpen(!dropdownOpen)}
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
      </SplitItem>
    </Split>
  );
};

export default PipelineCoreProjectSelector;
