import * as React from 'react';
import { FormGroup, HelperText, HelperTextItem, TextInput } from '@patternfly/react-core';
import { ProjectsContext, ProjectSelector } from '@odh-dashboard/ui-core';
import { byName, getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import type { ProjectKind } from '@odh-dashboard/k8s-core';

export type ProjectSectionType = {
  initialProjectName?: string;
  projectName?: string;
  setProjectName: (projectName?: string) => void;
};

export const isValidProjectName = (projectName?: string): boolean => {
  return !!projectName;
};

/**
 * The projects a new deployment may target: the host's deploy-capable subset
 * when it provides one, otherwise every project.
 */
export const useDeploymentTargetProjects = (): ProjectKind[] => {
  const { projects, deploymentTargetProjects } = React.useContext(ProjectsContext);
  return deploymentTargetProjects ?? projects;
};

/**
 * The deployment targets in ProjectSelector's shape, or undefined when the
 * host sets none (the selector then lists every project).
 */
export const useDeploymentTargetNamespaces = ():
  | { name: string; displayName: string }[]
  | undefined => {
  const { deploymentTargetProjects } = React.useContext(ProjectsContext);
  return React.useMemo(
    () =>
      deploymentTargetProjects?.map((project) => ({
        name: project.metadata.name,
        displayName: getDisplayNameFromK8sResource(project),
      })),
    [deploymentTargetProjects],
  );
};

export const useProjectSection = (initialProjectName?: string): ProjectSectionType => {
  const [projectName, setProjectNameState] = React.useState<string | undefined>(initialProjectName);
  const { projects, updatePreferredProject } = React.useContext(ProjectsContext);
  const targets = useDeploymentTargetProjects();

  const setProjectName = React.useCallback(
    (newProjectName?: string) => {
      setProjectNameState(newProjectName);

      // A target becomes the working project only when it is also browsable:
      // the pages that read the preference cannot show a deploy-only one.
      const project = targets.find(byName(newProjectName));
      if (project && projects.some(byName(newProjectName))) {
        updatePreferredProject(project);
      }
    },
    [targets, projects, updatePreferredProject],
  );
  return { initialProjectName, projectName, setProjectName };
};

const ProjectSection: React.FC<ProjectSectionType> = ({
  initialProjectName,
  projectName,
  setProjectName,
}) => {
  const projectLabel = `This is the project where the model will be deployed.`;
  const targetNamespaces = useDeploymentTargetNamespaces();
  if (!initialProjectName) {
    return (
      <FormGroup label="Project" isRequired>
        <HelperText>
          <HelperTextItem>{projectLabel}</HelperTextItem>
        </HelperText>
        <ProjectSelector
          namespace={projectName ?? ''}
          onSelection={(newProjectName: string) => setProjectName(newProjectName)}
          placeholder="Select target project"
          namespacesOverride={targetNamespaces}
          isFullWidth
        />
      </FormGroup>
    );
  }

  return (
    <FormGroup label={<>Project</>}>
      <HelperText>
        <HelperTextItem>{projectLabel}</HelperTextItem>
      </HelperText>
      <TextInput id="project-name" value={projectName} isDisabled data-testid="project-name" />
    </FormGroup>
  );
};

export default ProjectSection;
