import * as React from 'react';
import {
  Content,
  EmptyState,
  EmptyStateBody,
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
import { evalHubEvaluationsRoute } from '~/app/utilities/routes';
import { useEvaluationJobs } from '~/app/hooks/useEvaluationJobs';
import useEvalHubHealth from '~/app/hooks/useEvalHubHealth';
import { useCollectionNameMap } from '~/app/hooks/useCollectionNameMap';
import EvalHubHeader from '~/app/components/EvalHubHeader';
import EvalHubProjectSelector from '~/app/components/EvalHubProjectSelector';
import EvalHubEmptyState from '~/app/components/EvalHubEmptyState';
import EvaluationsTable from '~/app/components/EvaluationsTable';

const EvaluationsPage: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();

  const { isHealthy, loaded: healthLoaded } = useEvalHubHealth();

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
      loadError={isHealthy ? error : undefined}
      empty={healthLoaded && !isHealthy}
      emptyStatePage={
        <PageSection hasBodyWrapper={false} isFilled>
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
