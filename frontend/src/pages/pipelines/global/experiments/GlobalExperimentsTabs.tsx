import * as React from 'react';
import { PageSection, Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import { useNavigate } from 'react-router';
import '~/pages/pipelines/global/runs/GlobalPipelineRunsTabs.scss';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { experimentsTabRoute } from '~/routes/pipelines/experiments';
import { ExperimentListTabs, ExperimentListTabTitle } from './const';
import ActiveExperimentsList from './ActiveExperimentsList';
import ArchivedExperimentsList from './ArchivedExperimentsList';

type GlobalExperimentsTabProps = {
  tab: ExperimentListTabs;
};

const GlobalExperimentsTabs: React.FC<GlobalExperimentsTabProps> = ({ tab }) => {
  const navigate = useNavigate();
  const { namespace } = usePipelinesAPI();

  return (
    <Tabs
      activeKey={tab}
      onSelect={(_event, tabId) => navigate(experimentsTabRoute(namespace, tabId))}
      aria-label="Experiments page tabs"
      role="region"
      className="odh-pipeline-runs-page-tabs"
      data-testid="experiments-global-tabs"
    >
      <Tab
        eventKey={ExperimentListTabs.ACTIVE}
        title={<TabTitleText>{ExperimentListTabTitle.ACTIVE}</TabTitleText>}
        aria-label="Active experiments tab"
        className="odh-pipeline-runs-page-tabs__content"
        data-testid="experiments-active-tab"
      >
        <PageSection hasBodyWrapper={false} isFilled data-testid="experiments-active-tab-content">
          <ActiveExperimentsList />
        </PageSection>
      </Tab>
      <Tab
        eventKey={ExperimentListTabs.ARCHIVED}
        title={<TabTitleText>{ExperimentListTabTitle.ARCHIVED}</TabTitleText>}
        aria-label="Archived experiments tab"
        className="odh-pipeline-runs-page-tabs__content"
        data-testid="experiments-archived-tab"
      >
        <PageSection hasBodyWrapper={false} isFilled data-testid="experiments-archived-tab-content">
          <ArchivedExperimentsList />
        </PageSection>
      </Tab>
    </Tabs>
  );
};
export default GlobalExperimentsTabs;
