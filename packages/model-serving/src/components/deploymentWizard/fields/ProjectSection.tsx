import * as React from 'react';
import { FormGroup, Content, Popover, Button } from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';
import ProjectSelector from '@odh-dashboard/internal/pages/modelServing/screens/projects/InferenceServiceModal/ProjectSelector';
import { ProjectKind } from '@odh-dashboard/internal/k8sTypes';

type ProjectSectionType = {
  initialProject?: ProjectKind | null;
  project?: ProjectKind | null;
  setProject: (project: ProjectKind | null) => void;
};

export const isValidProject = (project: ProjectKind | null): boolean => {
  return !!project?.metadata.name;
};

export const useProjectSection = (
  initialProject?: ProjectKind | null,
): {
  initialProject?: ProjectKind | null;
  project: ProjectKind | null;
  setProject: (project: ProjectKind | null) => void;
} => {
  const [project, setProject] = React.useState<ProjectKind | null>(initialProject ?? null);
  return { initialProject, project, setProject };
};

const ProjectSection: React.FC<ProjectSectionType> = ({ initialProject, project, setProject }) => {
  if (!initialProject) {
    return (
      <ProjectSelector
        selectedProject={project ?? null}
        setSelectedProject={(newProject: ProjectKind | null) => setProject(newProject ?? null)}
      />
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
      <Content component="p">{project?.metadata.name}</Content>
    </FormGroup>
  );
};

export default ProjectSection;
