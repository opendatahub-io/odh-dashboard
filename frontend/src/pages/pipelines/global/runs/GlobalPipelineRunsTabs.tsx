import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageSection, Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import ScheduledRuns from '~/pages/pipelines/global/runs/ScheduledRuns';
import TriggeredRuns from '~/pages/pipelines/global/runs/TriggeredRuns';
import './GlobalPipelineRunsTabs.scss';

export enum PipelineRunType {
  Scheduled = 'scheduled',
  Triggered = 'triggered',
}

const GlobalPipelineRunsTab: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const runTypeSearchParam = searchParams.get('runType') as PipelineRunType;
  const [tab, setTab] = React.useState<PipelineRunType>(
    runTypeSearchParam || PipelineRunType.Scheduled,
  );

  return (
    <Tabs
      activeKey={tab}
      onSelect={(_event, tabId) => {
        setTab(tabId as PipelineRunType);
        runTypeSearchParam && setSearchParams({});
      }}
      aria-label="Pipeline run page tabs"
      role="region"
      className="odh-tabs-fix"
    >
      <Tab
        eventKey={PipelineRunType.Scheduled}
        title={<TabTitleText>Scheduled</TabTitleText>}
        aria-label="Scheduled runs tab"
        className="odh-tabcontent-fix"
      >
        <PageSection isFilled variant="light">
          <ScheduledRuns />
        </PageSection>
      </Tab>
      <Tab
        eventKey={PipelineRunType.Triggered}
        title={<TabTitleText>Triggered</TabTitleText>}
        aria-label="Triggered runs tab"
        className="odh-tabcontent-fix"
      >
        <PageSection isFilled variant="light">
          <TriggeredRuns />
        </PageSection>
      </Tab>
    </Tabs>
  );
};

export default GlobalPipelineRunsTab;
