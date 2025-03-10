import React from 'react';
import { Alert, FormGroup, Stack, StackItem } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { byName, ProjectsContext } from '~/concepts/projects/ProjectsContext';
import { KnownLabels, ProjectKind } from '~/k8sTypes';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import SimpleSelect from '~/components/SimpleSelect';

type ProjectSelectorProps = {
  selectedProject: ProjectKind | null;
  setSelectedProject: (project: ProjectKind | null) => void;
  error?: Error;
  modelRegistryName?: string;
  registeredModelId?: string;
  modelVersionId?: string;
  isOciModel?: boolean;
};

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  selectedProject,
  setSelectedProject,
  error,
  modelRegistryName,
  registeredModelId,
  modelVersionId,
  isOciModel,
}) => {
  const { projects } = React.useContext(ProjectsContext);
  const kserveProjects = projects.filter(
    (project) =>
      !project.metadata.labels?.[KnownLabels.MODEL_SERVING_PROJECT] ||
      project.metadata.labels[KnownLabels.MODEL_SERVING_PROJECT] === 'false',
  );

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
          <SimpleSelect
            isFullWidth
            isScrollable
            onChange={(selection) => {
              const foundProject = projects.find(byName(selection));
              if (foundProject) {
                setSelectedProject(foundProject);
              } else {
                setSelectedProject(null);
              }
            }}
            value={selectedProject?.metadata.name}
            options={(isOciModel ? kserveProjects : projects).map((project) => ({
              key: project.metadata.name,
              value: project.metadata.name,
              label: getDisplayNameFromK8sResource(project),
            }))}
            dataTestId="deploy-model-project-selector"
            toggleLabel={
              selectedProject
                ? getDisplayNameFromK8sResource(selectedProject)
                : 'Select target project'
            }
            toggleProps={{ id: 'deploy-model-project-selector' }}
            popperProps={{ appendTo: 'inline' }}
          />
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
