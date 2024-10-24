import React from 'react';
import {
  Alert,
  FormGroup,
  MenuToggle,
  Select,
  SelectList,
  SelectOption,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { byName, ProjectsContext } from '~/concepts/projects/ProjectsContext';
import { ProjectKind } from '~/k8sTypes';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';

type ProjectSelectorProps = {
  selectedProject: ProjectKind | null;
  setSelectedProject: (project: ProjectKind | null) => void;
  error?: Error;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  modelRegistryName?: string;
  registeredModelId?: string;
  modelVersionId?: string;
};

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  selectedProject,
  setSelectedProject,
  error,
  isOpen,
  setOpen,
  modelRegistryName,
  registeredModelId,
  modelVersionId,
}) => {
  const { projects } = React.useContext(ProjectsContext);

  const projectLinkUrlParams = new URLSearchParams();
  projectLinkUrlParams.set('section', ProjectSectionID.MODEL_SERVER);
  if (modelRegistryName && registeredModelId && modelVersionId) {
    projectLinkUrlParams.set('modelRegistryName', modelRegistryName);
    projectLinkUrlParams.set('registeredModelId', registeredModelId);
    projectLinkUrlParams.set('modelVersionId', modelVersionId);
  }

  return (
    <FormGroup label="Project" fieldId="deploy-model-project-selector" isRequired>
      <Stack hasGutter>
        <StackItem>
          <Select
            onSelect={(e, selection) => {
              if (typeof selection === 'string') {
                const foundProject = projects.find(byName(selection));
                if (foundProject) {
                  setSelectedProject(foundProject);
                } else {
                  setSelectedProject(null);
                }
              }
              setOpen(false);
            }}
            selected={selectedProject}
            onOpenChange={(open) => setOpen(open)}
            isOpen={isOpen}
            isScrollable
            toggle={(toggleRef) => (
              <MenuToggle
                ref={toggleRef}
                onClick={() => setOpen(!isOpen)}
                isExpanded={isOpen}
                isFullWidth
                data-testid="deploy-model-project-selector"
                id="deploy-model-project-selector"
              >
                {selectedProject
                  ? getDisplayNameFromK8sResource(selectedProject)
                  : 'Select target project'}
              </MenuToggle>
            )}
          >
            <SelectList>
              {projects.map((project) => (
                <SelectOption
                  key={project.metadata.uid}
                  value={project.metadata.name}
                  role="menuitem"
                >
                  {getDisplayNameFromK8sResource(project)}
                </SelectOption>
              ))}
            </SelectList>
          </Select>
        </StackItem>
        {error && selectedProject && (
          <StackItem>
            <Alert isInline variant="danger" title={error.message}>
              <Link
                to={`/projects/${selectedProject.metadata.name}?${projectLinkUrlParams.toString()}`}
              >
                Go to <b>{getDisplayNameFromK8sResource(selectedProject)}</b> project page
              </Link>
            </Alert>
          </StackItem>
        )}
      </Stack>
    </FormGroup>
  );
};

export default ProjectSelector;
