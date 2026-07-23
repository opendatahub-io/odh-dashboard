import React, { useMemo } from 'react';
import {
  Bullseye,
  Content,
  Flex,
  FlexItem,
  Label,
  PageSection,
  Spinner,
  Tooltip,
} from '@patternfly/react-core';
import { InfoCircleIcon } from '@patternfly/react-icons';
import { useSearchParams } from 'react-router-dom';
import { loadRemote } from '@module-federation/runtime';
import { LazyCodeRefComponent } from '@odh-dashboard/plugin-core';

// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import useIsMlflowCRAvailable from '@odh-dashboard/internal/concepts/mlflow/hooks/useIsMlflowCRAvailable';
import { ProjectIconWithSize } from '@odh-dashboard/internal/concepts/projects/ProjectIconWithSize';
import { IconSize } from '@odh-dashboard/internal/types';
import { useAppContext } from '@odh-dashboard/internal/app/AppContext';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import { getDashboardMainContainer } from '@odh-dashboard/internal/utilities/utils';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import { useUser } from '@odh-dashboard/internal/redux/selectors/user';
import ProjectSelectorNavigator from '@odh-dashboard/internal/concepts/projects/ProjectSelectorNavigator';
import TitleWithIcon from '@odh-dashboard/ui-core/design/TitleWithIcon';
import { ApplicationsPage, ProjectObjectType } from '@odh-dashboard/ui-core';
import {
  promptManagementPath,
  mlflowPromptManagementBaseRoute,
  WORKSPACE_QUERY_PARAM,
} from '@odh-dashboard/internal/routes/pipelines/mlflow';
import MLflowUnavailable from '../shared/MLflowUnavailable';
import MLflowNotConfigured from '../shared/MLflowNotConfigured';
import MlflowBreadcrumbs, { type BreadcrumbEntry } from '../shared/MlflowBreadcrumbs';
import LaunchMlflowButton from '../shared/LaunchMlflowButton';
import { PROMPT_MANAGEMENT_PAGE_TITLE } from '../shared/const';

const MlflowPromptManagementPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const workspace = searchParams.get(WORKSPACE_QUERY_PARAM) ?? '';
  const [breadcrumbs, setBreadcrumbs] = React.useState<BreadcrumbEntry[]>([]);
  const {
    available: mlflowAvailable,
    loaded: mlflowLoaded,
    error: mlflowStatusError,
  } = useIsMlflowCRAvailable();
  const { dashboardConfig } = useAppContext();
  const { isAdmin } = useUser();
  const globalProjectPromptsEnabled = dashboardConfig.spec.dashboardConfig.globalProjectPrompts;
  const globalNamespace = globalProjectPromptsEnabled
    ? dashboardConfig.spec.globalMLflowNamespaces?.[0]
    : undefined;
  const isGlobalProject = !!globalNamespace && workspace === globalNamespace;

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
      loaded={mlflowLoaded}
      empty={mlflowLoaded && !mlflowAvailable}
      emptyStatePage={
        <PageSection hasBodyWrapper={false} isFilled>
          {mlflowStatusError ? <MLflowUnavailable /> : <MLflowNotConfigured />}
        </PageSection>
      }
      noHeader={!isTopLevel}
      title={
        isTopLevel ? (
          <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapLg' }}>
            <FlexItem data-testid="prompt-management-page-title">
              <TitleWithIcon
                title={PROMPT_MANAGEMENT_PAGE_TITLE}
                objectType={ProjectObjectType.promptManagement}
              />
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
                    appendTo={getDashboardMainContainer}
                    {...(globalNamespace
                      ? { pinnedNamespace: { name: globalNamespace, label: 'Global project' } }
                      : {})}
                  />
                </FlexItem>
              </Flex>
            </FlexItem>
            {isGlobalProject && (
              <FlexItem alignSelf={{ default: 'alignSelfCenter' }}>
                <Tooltip
                  content={
                    isAdmin
                      ? 'Prompts in this project are shared across the cluster. Any edits you make will affect all users.'
                      : 'Prompts in this project are shared across the cluster.'
                  }
                >
                  <Label
                    data-testid="global-project-indicator"
                    color="orange"
                    icon={<InfoCircleIcon />}
                  >
                    Global project
                  </Label>
                </Tooltip>
              </FlexItem>
            )}
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
          <LaunchMlflowButton
            testId="mlflow-prompts-jump-link"
            section="prompt-management-page"
            workspace={workspace}
          />
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
