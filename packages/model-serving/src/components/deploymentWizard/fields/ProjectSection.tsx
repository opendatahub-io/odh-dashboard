import * as React from 'react';
import { FormGroup, HelperText, HelperTextItem, TextInput } from '@patternfly/react-core';
import ProjectSelector from '@odh-dashboard/ui-core/components/projectSelector/ProjectSelector';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import { byName } from '@odh-dashboard/k8s-core';
import { ODH_PRODUCT_NAME } from '@odh-dashboard/ui-core/utilities';

export type ProjectSectionType = {
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
  const projectLabel = `This is the ${ODH_PRODUCT_NAME} project where the model will be deployed.`;
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
