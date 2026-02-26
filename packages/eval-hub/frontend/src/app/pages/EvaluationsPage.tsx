import * as React from 'react';
import { Content, Flex, FlexItem, PageSection } from '@patternfly/react-core';
import { useParams } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { ProjectIconWithSize } from '@odh-dashboard/internal/concepts/projects/ProjectIconWithSize';
import { IconSize } from '@odh-dashboard/internal/types';
import { evalHubEvaluationsRoute } from '~/app/utilities/routes';
import EvalHubHeader from '~/app/components/EvalHubHeader';
import EvalHubProjectSelector from '~/app/components/EvalHubProjectSelector';
import EvalHubEmptyState from '~/app/components/EvalHubEmptyState';

const EvaluationsPage: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  const evaluationRuns: unknown[] = [];

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
      loaded
      empty={evaluationRuns.length === 0}
      emptyStatePage={
        <PageSection hasBodyWrapper={false} isFilled>
          <EvalHubEmptyState />
        </PageSection>
      }
      provideChildrenPadding
    >
      <div data-testid="eval-hub-evaluations-content" />
    </ApplicationsPage>
  );
};

export default EvaluationsPage;
