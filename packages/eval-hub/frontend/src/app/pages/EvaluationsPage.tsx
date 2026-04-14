import * as React from 'react';
import {
  Content,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
  Flex,
  FlexItem,
  PageSection,
} from '@patternfly/react-core';
import { CogIcon } from '@patternfly/react-icons';
import { useParams } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { ProjectIconWithSize } from '@odh-dashboard/internal/concepts/projects/ProjectIconWithSize';
import { IconSize } from '@odh-dashboard/internal/types';
import WhosMyAdministrator from '@odh-dashboard/internal/components/WhosMyAdministrator';
import SupportIcon from '~/app/icons/SupportIcon';
import { evalHubEvaluationsRoute } from '~/app/utilities/routes';
import { useEvaluationJobs } from '~/app/hooks/useEvaluationJobs';
import useEvalHubHealth from '~/app/hooks/useEvalHubHealth';
import { useCollectionNameMap } from '~/app/hooks/useCollectionNameMap';
import useUser from '~/app/hooks/useUser';
import EvalHubHeader from '~/app/components/EvalHubHeader';
import EvalHubProjectSelector from '~/app/components/EvalHubProjectSelector';
import EvalHubEmptyState from '~/app/components/EvalHubEmptyState';
import EvaluationsTable from '~/app/components/EvaluationsTable';

const EvaluationsPage: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  const { clusterAdmin } = useUser();

  const { isHealthy, loaded: healthLoaded, error: healthError } = useEvalHubHealth();

  const [evaluations, loaded, error, refreshEvaluations] = useEvaluationJobs(
    { namespace },
    !isHealthy,
  );
  const { collectionNameMap, loaded: collectionsLoaded } = useCollectionNameMap();

  return (
    <ApplicationsPage
      title={<EvalHubHeader title="Evaluations" />}
      description="Start and manage evaluation runs for models and agents."
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
                EvalHub custom resources are currently unavailable. To use evaluations, complete the
                EvalHub custom resources configuration.
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
                Evaluations are unavailable due to an incomplete configuration. To use this feature,
                contact your administrator.
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
        />
      )}
    </ApplicationsPage>
  );
};

export default EvaluationsPage;
