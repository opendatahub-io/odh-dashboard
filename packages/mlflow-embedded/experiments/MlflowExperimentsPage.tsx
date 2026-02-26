/**
 * MLflow Experiments page wrapper.
 *
 * Provides the page chrome (title, project selector, "Launch MLflow" link)
 * and loads the federated MLflow experiment tracking component below it.
 * Adapted from the old MLFlowExperimentsPage.tsx (iframe version).
 */
import React, { useMemo } from 'react';
import { Bullseye, Flex, FlexItem, Spinner } from '@patternfly/react-core';
import { useSearchParams } from 'react-router-dom';
import { loadRemote } from '@module-federation/runtime';
import { LazyCodeRefComponent } from '@odh-dashboard/plugin-core';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import PipelineCoreProjectSelector from '@odh-dashboard/internal/pages/pipelines/global/PipelineCoreProjectSelector';
import TitleWithIcon from '@odh-dashboard/internal/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '@odh-dashboard/internal/concepts/design/utils';
import {
  mlflowExperimentsBaseRoute,
  mlflowExperimentsPath,
  WORKSPACE_QUERY_PARAM,
} from '@odh-dashboard/internal/routes/pipelines/mlflow';
import { EXPERIMENTS_PAGE_TITLE } from '../shared/constants';
import MLflowUnavailable from '../shared/MLflowUnavailable';
import MlflowBreadcrumbs from '../shared/MlflowBreadcrumbs';
import LaunchMlflowButton from '../shared/LaunchMlflowButton';

const MlflowExperimentsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const workspace = searchParams.get(WORKSPACE_QUERY_PARAM) ?? '';
  const [breadcrumbs, setBreadcrumbs] = React.useState<{ label: string; path: string }[]>([]);

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
      loaded
      empty={false}
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
            />
          </FlexItem>
          <FlexItem>
            <LaunchMlflowButton testId="mlflow-embedded-jump-link" section="experiments-page" />
          </FlexItem>
        </Flex>
      }
      keepBodyWrapper={false}
    >
      {/* key={workspace} forces remount when the project changes. The remote's
          v6 BrowserRouter doesn't detect the host's v7 pushState navigation,
          so remounting is the cleanest way to reset with the new workspace. */}
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
