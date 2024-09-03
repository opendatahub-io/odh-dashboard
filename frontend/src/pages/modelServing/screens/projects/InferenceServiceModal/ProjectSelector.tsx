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
};

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  selectedProject,
  setSelectedProject,
  error,
  isOpen,
  setOpen,
}) => {
  const { projects } = React.useContext(ProjectsContext);

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
                to={`/projects/${selectedProject.metadata.name}?section=${ProjectSectionID.MODEL_SERVER}`}
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
