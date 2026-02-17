/**
 * MLflow Experiments page wrapper.
 *
 * Provides the page chrome (title, project selector, "Launch MLflow" link)
 * and loads the federated MLflow experiment tracking component below it.
 * Adapted from the old MLFlowExperimentsPage.tsx (iframe version).
 */
import React, { useMemo } from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Flex,
  FlexItem,
  Spinner,
} from '@patternfly/react-core';
import { ExclamationTriangleIcon, ExternalLinkAltIcon } from '@patternfly/react-icons';
import { useSearchParams } from 'react-router-dom';
import { loadRemote } from '@module-federation/runtime';
import { LazyCodeRefComponent } from '@odh-dashboard/plugin-core';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import PipelineCoreProjectSelector from '@odh-dashboard/internal/pages/pipelines/global/PipelineCoreProjectSelector';
import TitleWithIcon from '@odh-dashboard/internal/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '@odh-dashboard/internal/concepts/design/utils';
import { fireLinkTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import {
  mlflowExperimentsBaseRoute,
  mlflowExperimentsPath,
  WORKSPACE_QUERY_PARAM,
  MLFLOW_PROXY_BASE_PATH,
} from '@odh-dashboard/internal/routes/pipelines/mlflow';

const experimentsPageTitle = 'Experiments';

const MLflowUnavailable: React.FC = () => (
  <EmptyState
    headingLevel="h2"
    icon={ExclamationTriangleIcon}
    titleText="MLflow is currently unavailable"
    variant={EmptyStateVariant.lg}
    data-testid="mlflow-unavailable-empty-state"
  >
    <EmptyStateBody>
      The MLflow service could not be reached. Please check that MLflow is deployed and running,
      then try again.
    </EmptyStateBody>
  </EmptyState>
);

const MlflowExperimentsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const workspace = searchParams.get(WORKSPACE_QUERY_PARAM) ?? '';
  const [breadcrumbs, setBreadcrumbs] = React.useState<{ label: string; path: string }[]>([]);

  const loadWrapper = useMemo(
    () => () =>
      loadRemote<{ default: React.ComponentType }>('mlflow/MlflowExperimentWrapper')
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
            title={experimentsPageTitle}
            objectType={ProjectObjectType.pipelineExperiment}
          />
        ) : undefined
      }
      breadcrumb={
        !isTopLevel ? (
          <Breadcrumb>
            {breadcrumbs.map((b, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              // Prepend the host's base route and workspace param to MLflow's relative path
              const separator = b.path.includes('?') ? '&' : '?';
              const fullPath = `${mlflowExperimentsPath}${
                b.path
              }${separator}workspace=${encodeURIComponent(workspace)}`;
              return (
                <BreadcrumbItem
                  key={b.path}
                  isActive={isLast}
                  render={() =>
                    isLast ? (
                      b.label
                    ) : (
                      <Button
                        variant="link"
                        isInline
                        href={fullPath}
                        onClick={(e) => {
                          e.preventDefault();
                          window.history.pushState({}, '', fullPath);
                          window.dispatchEvent(new PopStateEvent('popstate'));
                        }}
                      >
                        {b.label}
                      </Button>
                    )
                  }
                />
              );
            })}
          </Breadcrumb>
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
            <Button
              component="a"
              isInline
              data-testid="mlflow-embedded-jump-link"
              href={MLFLOW_PROXY_BASE_PATH}
              target="_blank"
              rel="noopener noreferrer"
              variant="link"
              icon={<ExternalLinkAltIcon />}
              iconPosition="end"
              aria-label="Launch MLflow"
              onClick={() =>
                fireLinkTrackingEvent('Launch MLflow clicked', {
                  from: window.location.pathname,
                  href: MLFLOW_PROXY_BASE_PATH,
                  section: 'experiments-page',
                })
              }
            >
              Launch MLflow
            </Button>
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
