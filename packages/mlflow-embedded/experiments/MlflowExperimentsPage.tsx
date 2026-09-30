/**
 * MLflow Experiments page wrapper.
 *
 * Provides the page chrome (title, project selector, "Launch MLflow" link)
 * and loads the federated MLflow experiment tracking component below it.
 * Adapted from the old MLFlowExperimentsPage.tsx (iframe version).
 */
import React, { useMemo } from 'react';
import { Bullseye, Flex, FlexItem, PageSection, Spinner } from '@patternfly/react-core';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loadRemote } from '@module-federation/runtime';
import { LazyCodeRefComponent } from '@odh-dashboard/plugin-core';

// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import PipelineCoreProjectSelector from '@odh-dashboard/internal/pages/pipelines/global/PipelineCoreProjectSelector';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import { fireLinkTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import { MlflowTrackingEvents } from '@odh-dashboard/internal/concepts/mlflow/const';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import useIsMlflowCRAvailable from '@odh-dashboard/internal/concepts/mlflow/hooks/useIsMlflowCRAvailable';
import TitleWithIcon from '@odh-dashboard/ui-core/design/TitleWithIcon';
import { ApplicationsPage, ProjectObjectType } from '@odh-dashboard/ui-core';
import {
  agentObservabilityPath,
  mlflowExperimentsBaseRoute,
  mlflowExperimentsPath,
  mlflowPromptManagementBaseRoute,
  mlflowPromptRoute,
  WORKSPACE_QUERY_PARAM,
} from '@odh-dashboard/internal/routes/pipelines/mlflow';
import { EXPERIMENTS_PAGE_TITLE, WorkflowType } from '../shared/const';
import MLflowUnavailable from '../shared/MLflowUnavailable';
import MLflowNotConfigured from '../shared/MLflowNotConfigured';
import MlflowBreadcrumbs, { BreadcrumbEntry } from '../shared/MlflowBreadcrumbs';
import LaunchMlflowButton from '../shared/LaunchMlflowButton';

export type UnsupportedTabInfo = {
  experimentId?: string;
  tabName: string;
  promptName?: string;
  relativePath: string;
  search: string;
  workflowType: WorkflowType;
};

export type MlflowExperimentWrapperProps = {
  basename: string;
  onBreadcrumbChange: (breadcrumbs: BreadcrumbEntry[]) => void;
  workflowType: WorkflowType;
  onUnsupportedTab?: (info: UnsupportedTabInfo) => void;
};

type MlflowExperimentsPageProps = {
  pageTitle?: string;
  objectType?: ProjectObjectType;
  basePath?: string;
  getRedirectPath?: (namespace: string) => string;
  workflowType?: WorkflowType;
  launchSection?: string;
};

const MlflowExperimentsPage: React.FC<MlflowExperimentsPageProps> = ({
  pageTitle = EXPERIMENTS_PAGE_TITLE,
  objectType = ProjectObjectType.pipelineExperiment,
  basePath = mlflowExperimentsPath,
  getRedirectPath = mlflowExperimentsBaseRoute,
  workflowType = WorkflowType.MACHINE_LEARNING,
  launchSection = 'experiments-page',
}) => {
  const navigate = useNavigate();
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
      loadRemote<{ default: React.ComponentType<MlflowExperimentWrapperProps> }>(
        'mlflowEmbedded/MlflowExperimentWrapper',
      )
        .then((mod) => mod ?? { default: MLflowUnavailable })
        .catch(() => ({ default: MLflowUnavailable })),
    [],
  );

  const openUnsupportedTab = React.useCallback(
    ({
      tabName,
      promptName,
      relativePath,
      search,
      workflowType: tabWorkflowType,
    }: UnsupportedTabInfo) => {
      if (tabName === 'prompts') {
        const tabWorkspace = new URLSearchParams(search).get(WORKSPACE_QUERY_PARAM) ?? undefined;
        navigate(
          promptName
            ? mlflowPromptRoute(promptName, tabWorkspace)
            : mlflowPromptManagementBaseRoute(tabWorkspace),
          { replace: true },
        );
      } else if (tabWorkflowType === WorkflowType.MACHINE_LEARNING) {
        navigate(`${agentObservabilityPath}${relativePath}${search}`, { replace: true });
      }
    },
    [navigate],
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
      title={isTopLevel ? <TitleWithIcon title={pageTitle} objectType={objectType} /> : undefined}
      breadcrumb={
        !isTopLevel ? (
          <MlflowBreadcrumbs basePath={basePath} workspace={workspace} breadcrumbs={breadcrumbs} />
        ) : undefined
      }
      headerContent={
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
        >
          <FlexItem>
            <PipelineCoreProjectSelector
              getRedirectPath={getRedirectPath}
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
              section={launchSection}
              workspace={workspace}
            />
          </FlexItem>
        </Flex>
      }
      keepBodyWrapper={false}
    >
      <LazyCodeRefComponent<MlflowExperimentWrapperProps>
        key={workspace}
        component={loadWrapper}
        props={{
          basename: basePath,
          onBreadcrumbChange: setBreadcrumbs,
          workflowType,
          onUnsupportedTab: openUnsupportedTab,
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

export default MlflowExperimentsPage;
