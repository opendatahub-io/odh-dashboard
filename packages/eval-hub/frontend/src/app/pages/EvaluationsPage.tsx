import * as React from 'react';
import { Content, Flex, FlexItem, PageSection } from '@patternfly/react-core';
import { useParams } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { ProjectIconWithSize } from '@odh-dashboard/internal/concepts/projects/ProjectIconWithSize';
import { IconSize } from '@odh-dashboard/internal/types';
import { evalHubEvaluationsRoute } from '~/app/utilities/routes';
import { useEvaluationJobs } from '~/app/hooks/useEvaluationJobs';
import EvalHubHeader from '~/app/components/EvalHubHeader';
import EvalHubProjectSelector from '~/app/components/EvalHubProjectSelector';
import EvalHubEmptyState from '~/app/components/EvalHubEmptyState';
import EvaluationsTable from '~/app/components/EvaluationsTable';

const EvaluationsPage: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  const [evaluations, loaded, error] = useEvaluationJobs();

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
      loaded={loaded}
      loadError={error}
      empty={evaluations.length === 0}
      emptyStatePage={
        <PageSection hasBodyWrapper={false} isFilled>
          <EvalHubEmptyState />
        </PageSection>
      }
      provideChildrenPadding
    >
      <EvaluationsTable evaluations={evaluations} loaded={loaded} />
    </ApplicationsPage>
  );
};

export default EvaluationsPage;
