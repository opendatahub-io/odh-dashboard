import * as React from 'react';
import { PageSection, Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import ScheduledRuns from '~/pages/pipelines/global/runs/ScheduledRuns';
import TriggeredRuns from '~/pages/pipelines/global/runs/TriggeredRuns';
import './GlobalPipelineRunsTabs.scss';

enum PipelineRunsTabs {
  SCHEDULED,
  TRIGGERED,
}

const GlobalPipelineRunsTab: React.FC = () => {
  const [tab, setTab] = React.useState<PipelineRunsTabs>(PipelineRunsTabs.SCHEDULED);

  return (
    <Tabs
      activeKey={tab}
      onSelect={(e, tabId) => {
        if (PipelineRunsTabs[tabId]) {
          setTab(tabId as PipelineRunsTabs);
        }
      }}
      aria-label="Pipeline run page tabs"
      role="region"
      className="odh-tabs-fix"
    >
      <Tab
        eventKey={PipelineRunsTabs.SCHEDULED}
        title={<TabTitleText>Scheduled</TabTitleText>}
        aria-label="Scheduled tab"
        className="odh-tabcontent-fix"
      >
        <PageSection isFilled variant="light">
          <ScheduledRuns />
        </PageSection>
      </Tab>
      <Tab
        eventKey={PipelineRunsTabs.TRIGGERED}
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
