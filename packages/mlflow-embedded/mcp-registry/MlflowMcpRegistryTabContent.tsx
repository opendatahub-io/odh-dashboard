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
import { MCP_REGISTRY_BASENAME, mcpRegistryBaseRoute } from './const';
import useHostRouteSync from './useHostRouteSync';
import MLflowUnavailable from '../shared/MLflowUnavailable';

const MlflowMcpRegistryTabContent: React.FC = () => {
  const [searchParams] = useSearchParams();
  const workspace = searchParams.get(WORKSPACE_QUERY_PARAM) ?? '';
  const { projects, preferredProject } = React.useContext(ProjectsContext);
  const storedProject = getStoredPreferredProject(projects);
  const syncHostRoute = useHostRouteSync();

  const loadWrapper = useMemo(
    () => () =>
      loadRemote<{ default: React.ComponentType }>('mlflowEmbedded/MlflowMcpRegistryWrapper')
        .then((mod) => mod ?? { default: MLflowUnavailable })
        .catch(() => ({ default: MLflowUnavailable })),
    [],
  );

  if (!workspace && projects.length > 0) {
    const defaultProject = storedProject ?? preferredProject ?? projects[0];
    return <Navigate to={mcpRegistryBaseRoute(defaultProject.metadata.name)} replace />;
  }

  return (
    <>
      <PageSection hasBodyWrapper={false}>
        <Stack hasGutter>
          <StackItem>
            <Content component="p">
              Browse and manage registered MCP servers and access bindings.
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
                    getRedirectPath={mcpRegistryBaseRoute}
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
        props={{ basename: MCP_REGISTRY_BASENAME, onBreadcrumbChange: syncHostRoute }}
        fallback={
          <PageSection hasBodyWrapper={false}>
            <Bullseye>
              <Spinner />
            </Bullseye>
          </PageSection>
        }
      />
    </>
  );
};

export default MlflowMcpRegistryTabContent;
