import React, { useMemo } from 'react';
import { Bullseye, Content, Flex, FlexItem, Spinner, Title } from '@patternfly/react-core';
import { useSearchParams } from 'react-router-dom';
import { loadRemote } from '@module-federation/runtime';
import { LazyCodeRefComponent } from '@odh-dashboard/plugin-core';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { ProjectIconWithSize } from '@odh-dashboard/internal/concepts/projects/ProjectIconWithSize';
import { IconSize } from '@odh-dashboard/internal/types';
import ProjectSelectorNavigator from '@odh-dashboard/internal/concepts/projects/ProjectSelectorNavigator';
import {
  promptManagementPath,
  mlflowPromptManagementBaseRoute,
  WORKSPACE_QUERY_PARAM,
} from '@odh-dashboard/internal/routes/pipelines/mlflow';
import MLflowUnavailable from '../shared/MLflowUnavailable';
import MlflowBreadcrumbs, { type BreadcrumbEntry } from '../shared/MlflowBreadcrumbs';
import LaunchMlflowButton from '../shared/LaunchMlflowButton';

const MlflowPromptManagementPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const workspace = searchParams.get(WORKSPACE_QUERY_PARAM) ?? '';
  const [breadcrumbs, setBreadcrumbs] = React.useState<BreadcrumbEntry[]>([]);

  const loadWrapper = useMemo(
    () => () =>
      loadRemote<{ default: React.ComponentType }>('mlflowEmbedded/MlflowPromptsWrapper')
        .then((mod) => mod ?? { default: MLflowUnavailable })
        .catch(() => ({ default: MLflowUnavailable })),
    [],
  );

  const isTopLevel = breadcrumbs.length === 0;

  return (
    <ApplicationsPage
      loaded
      empty={false}
      noHeader={!isTopLevel}
      title={
        isTopLevel ? (
          <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapLg' }}>
            <FlexItem>
              <Title headingLevel="h1" data-testid="page-title">
                Prompts
              </Title>
            </FlexItem>
            <FlexItem>
              <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
                <ProjectIconWithSize size={IconSize.LG} />
                <FlexItem>
                  <Content component="p">Project</Content>
                </FlexItem>
                <FlexItem>
                  <ProjectSelectorNavigator
                    getRedirectPath={mlflowPromptManagementBaseRoute}
                    queryParamNamespace={WORKSPACE_QUERY_PARAM}
                  />
                </FlexItem>
              </Flex>
            </FlexItem>
          </Flex>
        ) : undefined
      }
      breadcrumb={
        !isTopLevel ? (
          <MlflowBreadcrumbs
            basePath={promptManagementPath}
            workspace={workspace}
            breadcrumbs={breadcrumbs}
          />
        ) : undefined
      }
      headerAction={
        isTopLevel ? (
          <LaunchMlflowButton testId="mlflow-prompts-jump-link" section="prompt-management-page" />
        ) : undefined
      }
      keepBodyWrapper={false}
    >
      <LazyCodeRefComponent
        key={workspace}
        component={loadWrapper}
        props={{ onBreadcrumbChange: setBreadcrumbs }}
        fallback={
          <Bullseye>
            <Spinner />
          </Bullseye>
        }
      />
    </ApplicationsPage>
  );
};

export default MlflowPromptManagementPage;
