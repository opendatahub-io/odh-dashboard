import React from 'react';
import { Alert, FormGroup, MenuItem, Stack, StackItem, Truncate } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';
import { KnownLabels, ProjectKind } from '~/k8sTypes';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import SearchSelector from '~/components/searchSelector/SearchSelector';

type ProjectSelectorProps = {
  selectedProject: ProjectKind | null;
  setSelectedProject: (project: ProjectKind | null) => void;
  error?: Error;
  projectLinkExtraUrlParams?: Record<string, string | undefined>;
  isOciModel?: boolean;
};

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  selectedProject,
  setSelectedProject,
  error,
  projectLinkExtraUrlParams,
  isOciModel,
}) => {
  const { projects } = React.useContext(ProjectsContext);
  const kserveProjects = projects.filter(
    (project) =>
      !project.metadata.labels?.[KnownLabels.MODEL_SERVING_PROJECT] ||
      project.metadata.labels[KnownLabels.MODEL_SERVING_PROJECT] === 'false',
  );
  const [searchText, setSearchText] = React.useState('');
  const bySearchText = React.useCallback(
    (project: ProjectKind) =>
      !searchText ||
      getDisplayNameFromK8sResource(project).toLowerCase().includes(searchText.toLowerCase()),
    [searchText],
  );

  const filteredProjects = isOciModel ? kserveProjects : projects;
  const visibleProjects = filteredProjects.filter(bySearchText);
  const projectLinkUrlParams = new URLSearchParams();
  projectLinkUrlParams.set('section', ProjectSectionID.MODEL_SERVER);
  if (projectLinkExtraUrlParams) {
    Object.entries(projectLinkExtraUrlParams).forEach(([key, value]) => {
      if (value) {
        projectLinkUrlParams.set(key, value);
      }
    });
  }

  return (
    <FormGroup label="Project" fieldId="deploy-model-project-selector" isRequired>
      <Stack hasGutter>
        <StackItem>
          <SearchSelector
            isFullWidth
            onSearchChange={(value) => setSearchText(value)}
            onSearchClear={() => setSearchText('')}
            searchValue={searchText}
            dataTestId="deploy-model-project-selector"
            toggleContent={
              selectedProject
                ? getDisplayNameFromK8sResource(selectedProject)
                : 'Select target project'
            }
            searchPlaceholder="Project name"
          >
            {visibleProjects.length === 0 && <MenuItem isDisabled>No matching results</MenuItem>}
            {visibleProjects.map((project) => (
              <MenuItem
                key={project.metadata.name}
                isSelected={project.metadata.name === selectedProject?.metadata.name}
                onClick={() => {
                  setSearchText('');
                  setSelectedProject(project);
                }}
              >
                <Truncate content={getDisplayNameFromK8sResource(project)}>
                  {getDisplayNameFromK8sResource(project)}
                </Truncate>
              </MenuItem>
            ))}
          </SearchSelector>
        </StackItem>
        {error && selectedProject && (
          <StackItem>
            <Alert isInline variant="danger" title="Configuration required">
              {error.message}
              <div>
                <Link
                  to={`/projects/${
                    selectedProject.metadata.name
                  }?${projectLinkUrlParams.toString()}`}
                >
                  Go to <b>{getDisplayNameFromK8sResource(selectedProject)}</b> project page
                </Link>
              </div>
            </Alert>
          </StackItem>
        )}
      </Stack>
    </FormGroup>
  );
};

export default ProjectSelector;
