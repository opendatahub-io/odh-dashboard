/**
 * MLflow Skill Registry page wrapper.
 *
 * Provides the page chrome (title with an inline project selector, "Launch MLflow" link)
 * and loads the federated MLflow Skill Registry component below it. The
 * remote handles the catalog and both skill detail routes
 * (`/:skillKey` and `/:organization/:skillName`) under one host route.
 */
import React, { useMemo } from 'react';
import { Bullseye, Content, Flex, FlexItem, PageSection, Spinner } from '@patternfly/react-core';
import { useSearchParams } from 'react-router-dom';
import { loadRemote } from '@module-federation/runtime';
import { LazyCodeRefComponent } from '@odh-dashboard/plugin-core';

// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import { fireLinkTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import { MlflowTrackingEvents } from '@odh-dashboard/internal/concepts/mlflow/const';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import useIsMlflowCRAvailable from '@odh-dashboard/internal/concepts/mlflow/hooks/useIsMlflowCRAvailable';
import { ProjectIconWithSize } from '@odh-dashboard/internal/concepts/projects/ProjectIconWithSize';
import { IconSize } from '@odh-dashboard/internal/types';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import { getDashboardMainContainer } from '@odh-dashboard/internal/utilities/utils';
import ProjectSelectorNavigator from '@odh-dashboard/ui-core/components/projectSelector/ProjectSelectorNavigator';
import TitleWithIcon from '@odh-dashboard/ui-core/design/TitleWithIcon';
import { ApplicationsPage, ProjectObjectType } from '@odh-dashboard/ui-core';
import { WORKSPACE_QUERY_PARAM } from '@odh-dashboard/internal/routes/pipelines/mlflow';
import { SKILL_REGISTRY_DESCRIPTION, SKILL_REGISTRY_PAGE_TITLE } from '../shared/const';
import {
  MLFLOW_SKILLS_HASH_PATH,
  skillRegistryBaseRoute,
  skillRegistryPath,
} from '../shared/routes';
import MLflowUnavailable from '../shared/MLflowUnavailable';
import MLflowNotConfigured from '../shared/MLflowNotConfigured';
import MlflowBreadcrumbs, { BreadcrumbEntry } from '../shared/MlflowBreadcrumbs';
import LaunchMlflowButton from '../shared/LaunchMlflowButton';

export type MlflowSkillRegistryWrapperProps = {
  basename: string;
  onBreadcrumbChange: (breadcrumbs: BreadcrumbEntry[]) => void;
};

const MlflowSkillRegistryPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const workspace = searchParams.get(WORKSPACE_QUERY_PARAM) ?? '';
  const [breadcrumbs, setBreadcrumbs] = React.useState<BreadcrumbEntry[]>([]);
  const {
    available: mlflowAvailable,
    loaded: mlflowLoaded,
    error: mlflowStatusError,
  } = useIsMlflowCRAvailable();

  const loadWrapper = useMemo(
    () => () =>
      loadRemote<{ default: React.ComponentType<MlflowSkillRegistryWrapperProps> }>(
        'mlflowEmbedded/MlflowSkillRegistryWrapper',
      )
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
            <FlexItem>
              <TitleWithIcon
                title={SKILL_REGISTRY_PAGE_TITLE}
                objectType={ProjectObjectType.skillRegistry}
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
                    getRedirectPath={skillRegistryBaseRoute}
                    queryParamNamespace={WORKSPACE_QUERY_PARAM}
                    appendTo={getDashboardMainContainer}
                    onProjectChange={(projectName) =>
                      fireLinkTrackingEvent(MlflowTrackingEvents.PROJECT_SWITCHED, {
                        projectName,
                      })
                    }
                  />
                </FlexItem>
              </Flex>
            </FlexItem>
          </Flex>
        ) : undefined
      }
      description={isTopLevel ? SKILL_REGISTRY_DESCRIPTION : undefined}
      breadcrumb={
        !isTopLevel ? (
          <MlflowBreadcrumbs
            basePath={skillRegistryPath}
            workspace={workspace}
            breadcrumbs={breadcrumbs}
          />
        ) : undefined
      }
      headerAction={
        isTopLevel ? (
          <LaunchMlflowButton
            testId="mlflow-skills-jump-link"
            section="skill-registry-page"
            workspace={workspace}
            hashPath={MLFLOW_SKILLS_HASH_PATH}
          />
        ) : undefined
      }
      keepBodyWrapper={false}
    >
      <LazyCodeRefComponent<MlflowSkillRegistryWrapperProps>
        key={workspace}
        component={loadWrapper}
        props={{
          basename: skillRegistryPath,
          onBreadcrumbChange: setBreadcrumbs,
        }}
        fallback={
          <Bullseye>
            <Spinner />
          </Bullseye>
        }
      />
    </ApplicationsPage>
  );
};

export default MlflowSkillRegistryPage;
