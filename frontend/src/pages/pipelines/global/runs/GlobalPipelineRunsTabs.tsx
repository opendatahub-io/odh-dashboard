import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageSection, Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import { asEnumMember } from '~/utilities/utils';
import {
  ScheduledRuns,
  ActiveRuns,
  ArchivedRuns,
  PipelineRunType,
  PipelineRunTabTitle,
} from '~/pages/pipelines/global/runs';
import { PipelineRunSearchParam } from '~/concepts/pipelines/content/types';

import './GlobalPipelineRunsTabs.scss';

const GlobalPipelineRunsTab: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const runType = asEnumMember<typeof PipelineRunType>(
    searchParams.get(PipelineRunSearchParam.RunType),
    PipelineRunType,
  );

  React.useEffect(() => {
    if (runType && !Object.values(PipelineRunType).includes(runType)) {
      searchParams.delete(PipelineRunSearchParam.RunType);
      setSearchParams(searchParams);
    }
  }, [runType, searchParams, setSearchParams]);

  return (
    <Tabs
      activeKey={runType || PipelineRunType.Active}
      onSelect={(_event, tabId) => setSearchParams({ runType: tabId as PipelineRunType })}
      aria-label="Pipeline run page tabs"
      role="region"
      className="odh-pipeline-runs-page-tabs"
      data-testid="pipeline-runs-global-tabs"
    >
      <Tab
        eventKey={PipelineRunType.Active}
        title={<TabTitleText>{PipelineRunTabTitle.Active}</TabTitleText>}
        aria-label={`${PipelineRunTabTitle.Active} tab`}
        className="odh-pipeline-runs-page-tabs__content"
        data-testid="active-runs-tab"
      >
        <PageSection isFilled variant="light">
          <ActiveRuns />
        </PageSection>
      </Tab>
      <Tab
        eventKey={PipelineRunType.Archived}
        title={<TabTitleText>Archived runs</TabTitleText>}
        aria-label={`${PipelineRunTabTitle.Archived} tab`}
        className="odh-pipeline-runs-page-tabs__content"
        data-testid="archived-runs-tab"
      >
        <PageSection isFilled variant="light">
          <ArchivedRuns />
        </PageSection>
      </Tab>
      <Tab
        eventKey={PipelineRunType.Scheduled}
        title={<TabTitleText>{PipelineRunTabTitle.Schedules}</TabTitleText>}
        aria-label={`${PipelineRunTabTitle.Schedules} tab`}
        className="odh-pipeline-runs-page-tabs__content"
        data-testid="schedules-tab"
      >
        <PageSection isFilled variant="light">
          <ScheduledRuns />
        </PageSection>
      </Tab>
    </Tabs>
  );
};

export default GlobalPipelineRunsTab;
