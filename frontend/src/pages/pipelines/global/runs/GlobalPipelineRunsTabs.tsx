import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageSection, Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import { asEnumMember } from '~/utilities/utils';
import {
  ScheduledRuns,
  ActiveRuns,
  ArchivedRuns,
  PipelineRunType,
  PipelineRunTabTitle,
} from '~/pages/pipelines/global/runs';

import './GlobalPipelineRunsTabs.scss';

type GlobalPipelineRunsTabsProps = {
  basePath: string;
  tab: PipelineRunType;
};

const GlobalPipelineRunsTabs: React.FC<GlobalPipelineRunsTabsProps> = ({ tab, basePath }) => {
  const navigate = useNavigate();

  return (
    <Tabs
      activeKey={tab}
      onSelect={(_event, tabId) => {
        const enumValue = asEnumMember(tabId, PipelineRunType);
        navigate(
          `${basePath}/${
            enumValue === PipelineRunType.SCHEDULED ? 'schedules' : `runs/${enumValue}`
          }`,
        );
      }}
      aria-label="Pipeline run page tabs"
      role="region"
      className="odh-pipeline-runs-page-tabs"
      data-testid="pipeline-runs-global-tabs"
    >
      <Tab
        eventKey={PipelineRunType.ACTIVE}
        title={<TabTitleText>{PipelineRunTabTitle.ACTIVE}</TabTitleText>}
        aria-label={`${PipelineRunTabTitle.ACTIVE} tab`}
        className="odh-pipeline-runs-page-tabs__content"
        data-testid="active-runs-tab"
      >
        <PageSection hasBodyWrapper={false} isFilled>
          <ActiveRuns />
        </PageSection>
      </Tab>

      <Tab
        eventKey={PipelineRunType.ARCHIVED}
        title={<TabTitleText>{PipelineRunTabTitle.ARCHIVED}</TabTitleText>}
        aria-label={`${PipelineRunTabTitle.ARCHIVED} tab`}
        className="odh-pipeline-runs-page-tabs__content"
        data-testid="archived-runs-tab"
      >
        <PageSection hasBodyWrapper={false} isFilled>
          <ArchivedRuns />
        </PageSection>
      </Tab>

      <Tab
        eventKey={PipelineRunType.SCHEDULED}
        title={<TabTitleText>{PipelineRunTabTitle.SCHEDULES}</TabTitleText>}
        aria-label={`${PipelineRunTabTitle.SCHEDULES} tab`}
        className="odh-pipeline-runs-page-tabs__content"
        data-testid="schedules-tab"
      >
        <PageSection hasBodyWrapper={false} isFilled>
          <ScheduledRuns />
        </PageSection>
      </Tab>
    </Tabs>
  );
};

export default GlobalPipelineRunsTabs;
