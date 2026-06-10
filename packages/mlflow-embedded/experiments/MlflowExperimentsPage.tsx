/**
 * MLflow Experiments page wrapper.
 *
 * Provides the page chrome (title, project selector, "Launch MLflow" link)
 * and loads the federated MLflow experiment tracking component below it.
 * Adapted from the old MLFlowExperimentsPage.tsx (iframe version).
 */
import React, { useMemo } from 'react';
import { Bullseye, Flex, FlexItem, PageSection, Spinner } from '@patternfly/react-core';
import { useSearchParams } from 'react-router-dom';
import { loadRemote } from '@module-federation/runtime';
import { LazyCodeRefComponent } from '@odh-dashboard/plugin-core';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import PipelineCoreProjectSelector from '@odh-dashboard/internal/pages/pipelines/global/PipelineCoreProjectSelector';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import { fireLinkTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import { MlflowTrackingEvents } from '@odh-dashboard/internal/concepts/mlflow/const';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import useIsMlflowCRAvailable from '@odh-dashboard/internal/concepts/mlflow/hooks/useIsMlflowCRAvailable';
import TitleWithIcon from '@odh-dashboard/internal/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '@odh-dashboard/internal/concepts/design/utils';
import {
  mlflowExperimentsBaseRoute,
  mlflowExperimentsPath,
  WORKSPACE_QUERY_PARAM,
} from '@odh-dashboard/internal/routes/pipelines/mlflow';
import { EXPERIMENTS_PAGE_TITLE } from '../shared/const';
import MLflowUnavailable from '../shared/MLflowUnavailable';
import MLflowNotConfigured from '../shared/MLflowNotConfigured';
import MlflowBreadcrumbs, { BreadcrumbEntry } from '../shared/MlflowBreadcrumbs';
import LaunchMlflowButton from '../shared/LaunchMlflowButton';

const MlflowExperimentsPage: React.FC = () => {
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
      loadRemote<{ default: React.ComponentType }>('mlflowEmbedded/MlflowExperimentWrapper')
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
          <TitleWithIcon
            title={EXPERIMENTS_PAGE_TITLE}
            objectType={ProjectObjectType.pipelineExperiment}
          />
        ) : undefined
      }
      breadcrumb={
        !isTopLevel ? (
          <MlflowBreadcrumbs
            basePath={mlflowExperimentsPath}
            workspace={workspace}
            breadcrumbs={breadcrumbs}
          />
        ) : undefined
      }
      headerContent={
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
        >
          <FlexItem>
            <PipelineCoreProjectSelector
              getRedirectPath={mlflowExperimentsBaseRoute}
              queryParamNamespace={WORKSPACE_QUERY_PARAM}
              onProjectChange={(projectName) =>
                fireLinkTrackingEvent(MlflowTrackingEvents.PROJECT_SWITCHED, {
                  projectName,
                })
              }
            />
          </FlexItem>
          <FlexItem>
            <LaunchMlflowButton
              testId="mlflow-embedded-jump-link"
              section="experiments-page"
              workspace={workspace}
            />
          </FlexItem>
        </Flex>
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

export default MlflowExperimentsPage;
