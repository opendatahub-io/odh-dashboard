import React, { useMemo } from 'react';
import {
  Bullseye,
  Content,
  Flex,
  FlexItem,
  PageSection,
  Spinner,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { Navigate, useSearchParams } from 'react-router-dom';
import { loadRemote } from '@module-federation/runtime';
import { LazyCodeRefComponent } from '@odh-dashboard/plugin-core';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import { getStoredPreferredProject } from '@odh-dashboard/ui-core/context/getStoredPreferredProject';
import { ProjectIconWithSize } from '@odh-dashboard/internal/concepts/projects/ProjectIconWithSize';
import { IconSize } from '@odh-dashboard/internal/types';
import ProjectSelectorNavigator from '@odh-dashboard/ui-core/components/projectSelector/ProjectSelectorNavigator';
import { WORKSPACE_QUERY_PARAM } from '@odh-dashboard/internal/routes/pipelines/mlflow';
import { SKILL_REGISTRY_BASENAME, skillRegistryBaseRoute } from './const';
import useHostRouteSync from '../shared/useHostRouteSync';
import MLflowUnavailable from '../shared/MLflowUnavailable';
import NoProjectsEmptyState from '../shared/NoProjectsEmptyState';

const LoadingState: React.FC = () => (
  <PageSection hasBodyWrapper={false}>
    <Bullseye>
      <Spinner />
    </Bullseye>
  </PageSection>
);

const MlflowSkillRegistryTabContent: React.FC = () => {
  const [searchParams] = useSearchParams();
  const workspace = searchParams.get(WORKSPACE_QUERY_PARAM) ?? '';
  const {
    projects,
    preferredProject,
    loaded: projectsLoaded,
    loadError: projectsLoadError,
  } = React.useContext(ProjectsContext);
  const storedProject = getStoredPreferredProject(projects);
  const syncHostRoute = useHostRouteSync();

  const loadWrapper = useMemo(
    () => () =>
      loadRemote<{ default: React.ComponentType }>('mlflowEmbedded/MlflowSkillRegistryWrapper')
        .then((mod) => mod ?? { default: MLflowUnavailable })
        .catch(() => ({ default: MLflowUnavailable })),
    [],
  );

  if (!projectsLoaded && !projectsLoadError) {
    return <LoadingState />;
  }

  if (projects.length === 0) {
    return (
      <PageSection hasBodyWrapper={false}>
        <NoProjectsEmptyState
          message="To register a skill, first create a project."
          testId="skill-registry-no-projects-empty-state"
          getRedirectPath={skillRegistryBaseRoute}
        />
      </PageSection>
    );
  }

  if (!workspace) {
    const defaultProject = storedProject ?? preferredProject ?? projects[0];
    return <Navigate to={skillRegistryBaseRoute(defaultProject.metadata.name)} replace />;
  }

  return (
    <>
      <PageSection hasBodyWrapper={false}>
        <Stack hasGutter>
          <StackItem>
            <Content component="p">
              Browse and manage registered skills and their versions for your AI agents.
            </Content>
          </StackItem>
          <StackItem>
            <Flex
              spaceItems={{ default: 'spaceItemsXs' }}
              alignItems={{ default: 'alignItemsCenter' }}
            >
              <ProjectIconWithSize size={IconSize.XXL} />
              <Flex
                spaceItems={{ default: 'spaceItemsSm' }}
                alignItems={{ default: 'alignItemsCenter' }}
              >
                <FlexItem>
                  <Content>Project</Content>
                </FlexItem>
                <FlexItem>
                  <ProjectSelectorNavigator
                    getRedirectPath={skillRegistryBaseRoute}
                    queryParamNamespace={WORKSPACE_QUERY_PARAM}
                  />
                </FlexItem>
              </Flex>
            </Flex>
          </StackItem>
        </Stack>
      </PageSection>
      <LazyCodeRefComponent
        key={workspace}
        component={loadWrapper}
        props={{ basename: SKILL_REGISTRY_BASENAME, onBreadcrumbChange: syncHostRoute }}
        fallback={<LoadingState />}
      />
    </>
  );
};

export default MlflowSkillRegistryTabContent;
