import * as React from 'react';
import { PageSection, Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import { useNavigate } from 'react-router';
import '~/pages/pipelines/global/runs/GlobalPipelineRunsTabs.scss';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import ExperimentsList from './ExperimentsList';
import { ExperimentListTabs } from './const';

type GlobalExperimentsTabProps = {
  tab: ExperimentListTabs;
};

const GlobalExperimentsTabs: React.FC<GlobalExperimentsTabProps> = ({ tab }) => {
  const navigate = useNavigate();
  const { namespace } = usePipelinesAPI();

  return (
    <Tabs
      activeKey={tab || ExperimentListTabs.ACTIVE}
      onSelect={(_event, tabId) => navigate(`/pipelines/experiments/${namespace}/${tabId}`)}
      aria-label="Experiments page tabs"
      role="region"
      className="odh-pipeline-runs-page-tabs"
      data-testid="experiments-global-tabs"
    >
      <Tab
        eventKey={ExperimentListTabs.ACTIVE}
        title={<TabTitleText>Active</TabTitleText>}
        aria-label="Active experiments tab"
        className="odh-pipeline-runs-page-tabs__content"
        data-testid="experiments-active-tab"
      >
        <PageSection isFilled variant="light">
          <ExperimentsList tab={ExperimentListTabs.ACTIVE} />
        </PageSection>
      </Tab>
      <Tab
        eventKey={ExperimentListTabs.ARCHIVED}
        title={<TabTitleText>Archived</TabTitleText>}
        aria-label="Archived experiments tab"
        className="odh-pipeline-runs-page-tabs__content"
        data-testid="experiments-archived-tab"
      >
        <PageSection isFilled variant="light">
          <ExperimentsList tab={ExperimentListTabs.ARCHIVED} />
        </PageSection>
      </Tab>
    </Tabs>
  );
};
export default GlobalExperimentsTabs;
