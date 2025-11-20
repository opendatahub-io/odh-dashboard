import * as React from 'react';
import { FormGroup, Content, Popover, Button } from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';
import ProjectSelector from '@odh-dashboard/internal/concepts/projects/ProjectSelector';
import { ProjectsContext, byName } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';

type ProjectSectionType = {
  initialProjectName?: string;
  projectName?: string;
  setProjectName: (projectName?: string) => void;
};

export const isValidProjectName = (projectName?: string): boolean => {
  return !!projectName;
};

export const useProjectSection = (initialProjectName?: string): ProjectSectionType => {
  const [projectName, setProjectNameState] = React.useState<string | undefined>(initialProjectName);
  const { projects, updatePreferredProject } = React.useContext(ProjectsContext);

  const setProjectName = React.useCallback(
    (newProjectName?: string) => {
      setProjectNameState(newProjectName);

      const project = projects.find(byName(newProjectName));
      if (project) {
        updatePreferredProject(project);
      }
    },
    [projects, updatePreferredProject],
  );
  return { initialProjectName, projectName, setProjectName };
};

const ProjectSection: React.FC<ProjectSectionType> = ({
  initialProjectName,
  projectName,
  setProjectName,
}) => {
  if (!initialProjectName) {
    return (
      <FormGroup label="Project" isRequired>
        <ProjectSelector
          namespace={projectName ?? ''}
          onSelection={(newProjectName: string) => setProjectName(newProjectName)}
          placeholder="Select target project"
          isFullWidth
        />
      </FormGroup>
    );
  }

  return (
    <FormGroup
      label={
        <>
          Project
          <Popover
            bodyContent="The OpenShift project where the model will be deployed. The inference service and serving runtime objects will be created in this project."
            position="right"
          >
            <Button
              variant="plain"
              aria-label="More info for project field"
              className="pf-v5-u-ml-xs"
            >
              <HelpIcon />
            </Button>
          </Popover>
        </>
      }
    >
      <Content component="p">{projectName}</Content>
    </FormGroup>
  );
};

export default ProjectSection;
