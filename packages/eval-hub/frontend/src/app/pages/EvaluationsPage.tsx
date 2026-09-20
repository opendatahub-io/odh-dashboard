import * as React from 'react';
import {
  Bullseye,
  Content,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
  Flex,
  FlexItem,
  PageSection,
  Spinner,
} from '@patternfly/react-core';
import { CogIcon } from '@patternfly/react-icons';
import { useNavigate, useParams } from 'react-router-dom';

import { ProjectIconWithSize } from '@odh-dashboard/internal/concepts/projects/ProjectIconWithSize';
import { IconSize } from '@odh-dashboard/internal/types';
import { ApplicationsPage, WhosMyAdministrator } from '@odh-dashboard/ui-core';
import SupportIcon from '~/app/icons/SupportIcon';
import { evalHubEvaluationsRoute } from '~/app/utilities/routes';
import { evaluationReconfigureRoute } from '~/app/routes';
import { useEvaluationJobs } from '~/app/hooks/useEvaluationJobs';
import useEvalHubHealth from '~/app/hooks/useEvalHubHealth';
import { useCollectionNameMap } from '~/app/hooks/useCollectionNameMap';
import useUser from '~/app/hooks/useUser';
import EvalHubHeader from '~/app/components/EvalHubHeader';
import EvalHubProjectSelector from '~/app/components/EvalHubProjectSelector';
import EvalHubEmptyState from '~/app/components/EvalHubEmptyState';
import usePageVisibility from '~/app/hooks/usePageVisibility';
import EvaluationsTable from '~/app/components/EvaluationsTable';
import { EvaluationJob } from '~/app/types';
import StopEvaluationModal from '~/app/components/StopEvaluationModal';

const EvaluationStatusModal = React.lazy(() => import('~/app/components/EvaluationStatusModal'));

const EvaluationsPage: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  const { clusterAdmin } = useUser();

  // Pause list polling when the browser tab is backgrounded
  const isPollingEnabled = usePageVisibility();

  const { isHealthy, loaded: healthLoaded, error: healthError } = useEvalHubHealth(namespace);

  const [evaluations, loaded, error, refreshEvaluations] = useEvaluationJobs(
    { namespace },
    !isHealthy,
    isPollingEnabled,
  );
  const { collectionNameMap, loaded: collectionsLoaded } = useCollectionNameMap();
  const [selectedJob, setSelectedJob] = React.useState<
    { job: EvaluationJob; namespace: string } | undefined
  >();
  const navigate = useNavigate();
  const [pendingStopJob, setPendingStopJob] = React.useState<EvaluationJob | undefined>();

  const polledJobData = React.useMemo(
    () =>
      selectedJob
        ? evaluations.find((e) => e.resource.id === selectedJob.job.resource.id)
        : undefined,
    [evaluations, selectedJob],
  );

  const onShowStatus = React.useCallback(
    (job: EvaluationJob) => {
      setSelectedJob(namespace ? { job, namespace } : undefined);
    },
    [namespace],
  );

  return (
    <>
      <ApplicationsPage
        title={<EvalHubHeader title="Evaluations" />}
        description="Start and manage evaluation runs for models, agents and datasets."
        headerContent={
          <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
            <ProjectIconWithSize size={IconSize.LG} />
            <FlexItem>
              <Content component="p">Project</Content>
            </FlexItem>
            <FlexItem>
              <EvalHubProjectSelector
                namespace={namespace}
                getRedirectPath={evalHubEvaluationsRoute}
              />
            </FlexItem>
          </Flex>
        }
        loaded={healthLoaded && (!isHealthy || loaded)}
        loadError={isHealthy ? error : healthError}
        loadErrorPage={
          <PageSection hasBodyWrapper={false} isFilled>
            {clusterAdmin ? (
              <EmptyState
                headingLevel="h4"
                icon={CogIcon}
                titleText="Evaluations unavailable"
                variant={EmptyStateVariant.lg}
                data-testid="evalhub-load-error-admin-empty-state"
              >
                <EmptyStateBody>
                  EvalHub custom resources are currently unavailable. To use evaluations, complete
                  the EvalHub custom resources configuration.
                </EmptyStateBody>
              </EmptyState>
            ) : (
              <EmptyState
                headingLevel="h4"
                icon={SupportIcon}
                titleText="Evaluations unavailable"
                variant={EmptyStateVariant.lg}
                data-testid="evalhub-load-error-nonadmin-empty-state"
              >
                <EmptyStateBody>
                  Evaluations are unavailable due to an incomplete configuration. To use this
                  feature, contact your administrator.
                </EmptyStateBody>
                <EmptyStateFooter>
                  <WhosMyAdministrator />
                </EmptyStateFooter>
              </EmptyState>
            )}
          </PageSection>
        }
        empty={healthLoaded && !isHealthy && !healthError}
        emptyStatePage={
          <PageSection hasBodyWrapper={false} isFilled>
            {clusterAdmin ? (
              <EmptyState
                headingLevel="h4"
                icon={CogIcon}
                titleText="Evaluations unavailable"
                variant={EmptyStateVariant.lg}
                data-testid="evalhub-unavailable-empty-state"
              >
                <EmptyStateBody>
                  To use evaluations, enable the evaluation service using the TrustyAI Operator.
                </EmptyStateBody>
              </EmptyState>
            ) : (
              <EmptyState
                headingLevel="h4"
                icon={SupportIcon}
                titleText="Admin configuration required"
                variant={EmptyStateVariant.lg}
                data-testid="evalhub-nonadmin-empty-state"
              >
                <EmptyStateBody>
                  To use this service, request that your administrator enable evaluations for this
                  cluster.
                </EmptyStateBody>
                <EmptyStateFooter>
                  <WhosMyAdministrator />
                </EmptyStateFooter>
              </EmptyState>
            )}
          </PageSection>
        }
        provideChildrenPadding
      >
        {evaluations.length === 0 ? (
          <EvalHubEmptyState />
        ) : (
          <EvaluationsTable
            evaluations={evaluations}
            loaded={loaded}
            namespace={namespace}
            collectionNameMap={collectionNameMap}
            collectionsLoaded={collectionsLoaded}
            onRefresh={refreshEvaluations}
            onShowStatus={onShowStatus}
          />
        )}
      </ApplicationsPage>
      {selectedJob && selectedJob.namespace === namespace ? (
        <React.Suspense
          fallback={
            <Bullseye>
              <Spinner />
            </Bullseye>
          }
        >
          <EvaluationStatusModal
            job={selectedJob.job}
            namespace={selectedJob.namespace}
            polledJobData={polledJobData}
            onClose={() => setSelectedJob(undefined)}
            onRequestStop={(job) => {
              setSelectedJob(undefined);
              setPendingStopJob(job);
            }}
            onRequestReconfigure={(job) => {
              setSelectedJob(undefined);
              navigate(evaluationReconfigureRoute(namespace, job.resource.id));
            }}
          />
        </React.Suspense>
      ) : null}
      {pendingStopJob && namespace && (
        <StopEvaluationModal
          job={pendingStopJob}
          namespace={namespace}
          onClose={() => setPendingStopJob(undefined)}
          onComplete={refreshEvaluations}
        />
      )}
    </>
  );
};

export default EvaluationsPage;
