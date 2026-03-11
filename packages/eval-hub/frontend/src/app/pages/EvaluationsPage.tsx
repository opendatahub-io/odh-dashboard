import * as React from 'react';
import {
  Content,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Flex,
  FlexItem,
  Icon,
  PageSection,
  Popover,
  Spinner,
} from '@patternfly/react-core';
import { CubesIcon, InfoCircleIcon } from '@patternfly/react-icons';
import { useParams } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { ProjectIconWithSize } from '@odh-dashboard/internal/concepts/projects/ProjectIconWithSize';
import { IconSize } from '@odh-dashboard/internal/types';
import { evalHubEvaluationsRoute } from '~/app/utilities/routes';
import { useEvaluationJobs } from '~/app/hooks/useEvaluationJobs';
import useFetchEvalHubStatus from '~/app/hooks/useFetchEvalHubStatus';
import EvalHubHeader from '~/app/components/EvalHubHeader';
import EvalHubProjectSelector from '~/app/components/EvalHubProjectSelector';
import EvalHubEmptyState from '~/app/components/EvalHubEmptyState';
import EvaluationsTable from '~/app/components/EvaluationsTable';

const EvaluationsPage: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();

  const [activelyRefreshing, setActivelyRefreshing] = React.useState(true);
  const {
    data: crStatus,
    loaded: crStatusLoaded,
    error: crStatusError,
  } = useFetchEvalHubStatus(namespace, activelyRefreshing);

  React.useEffect(() => {
    if (!crStatus || (crStatus.phase !== 'Initializing' && crStatus.phase !== 'Pending')) {
      setActivelyRefreshing(false);
    } else {
      setActivelyRefreshing(true);
    }
    return () => {
      setActivelyRefreshing(false);
    };
  }, [crStatus]);

  const evalHubNotReady = crStatus?.phase !== 'Ready';
  const [evaluations, loaded, error, refreshEvaluations] = useEvaluationJobs(
    { namespace },
    evalHubNotReady,
  );

  return (
    <ApplicationsPage
      title={<EvalHubHeader title="Evaluations" />}
      description="Run evaluations on models, agents, and datasets to optimize performance."
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
      loaded={crStatusLoaded && (evalHubNotReady || loaded)}
      loadError={crStatusError || error}
      empty={!crStatus}
      emptyStatePage={
        <PageSection hasBodyWrapper={false} isFilled>
          <EmptyState
            headingLevel="h2"
            icon={CubesIcon}
            titleText="No existing evaluation services"
            variant={EmptyStateVariant.lg}
            data-testid="evalhub-not-found-empty-state"
          >
            <EmptyStateBody>
              The evaluation service is not enabled. Contact your administrator to enable it.{' '}
              <Popover
                alertSeverityVariant="info"
                headerContent="Admin information"
                headerIcon={<InfoCircleIcon />}
                bodyContent="Enable evaluations via the TrustyAI operator to get started."
              >
                <Icon status="info">
                  <InfoCircleIcon />
                </Icon>
              </Popover>
            </EmptyStateBody>
          </EmptyState>
        </PageSection>
      }
      provideChildrenPadding
    >
      {crStatus?.phase === 'Ready' ? (
        evaluations.length === 0 ? (
          <EvalHubEmptyState />
        ) : (
          <EvaluationsTable
            evaluations={evaluations}
            loaded={loaded}
            namespace={namespace}
            onRefresh={refreshEvaluations}
          />
        )
      ) : crStatus?.phase === 'Failed' ? (
        <EmptyState
          headingLevel="h4"
          titleText="EvalHub setup failed"
          variant={EmptyStateVariant.lg}
          status="danger"
          data-testid="evalhub-failed-state"
        >
          <EmptyStateBody>
            The EvalHub instance in this project failed to initialize. Check the EvalHub custom
            resource status for details or contact your administrator.
          </EmptyStateBody>
        </EmptyState>
      ) : (
        <EmptyState
          headingLevel="h4"
          titleText="Setting up EvalHub"
          icon={Spinner}
          data-testid="evalhub-initializing-state"
        >
          <EmptyStateBody>
            EvalHub is being initialized in this project. This may take a few moments.
          </EmptyStateBody>
        </EmptyState>
      )}
    </ApplicationsPage>
  );
};

export default EvaluationsPage;
