import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageSection, Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import { asEnumMember } from '#~/utilities/utils';
import ScheduledRuns from '#~/pages/pipelines/global/runs/ScheduledRuns';
import { ActiveRuns } from '#~/pages/pipelines/global/runs/ActiveRuns';
import { ArchivedRuns } from '#~/pages/pipelines/global/runs/ArchivedRuns';
import { PipelineRunType, PipelineRunTabTitle } from '#~/pages/pipelines/global/runs/types';

import './GlobalPipelineRunsTabs.scss';

type GlobalPipelineRunsTabsProps = {
  basePath: string;
  tab: PipelineRunType;
};

const GlobalPipelineRunsTabs: React.FC<GlobalPipelineRunsTabsProps> = ({ tab, basePath }) => {
  const navigate = useNavigate();

  // This is used to record the most recent search params for each tab
  // so when you switch between tabs, it can record the filters
  const [searchParams] = useSearchParams();
  const searchParamsRef = React.useRef<Partial<Record<PipelineRunType, URLSearchParams>>>({});
  searchParamsRef.current[tab] = searchParams;

  return (
    <Tabs
      activeKey={tab}
      onSelect={(_event, tabId) => {
        const enumValue = asEnumMember(tabId, PipelineRunType);
        if (enumValue) {
          navigate(
            `${basePath}/${
              enumValue === PipelineRunType.SCHEDULED ? 'schedules' : `runs/${enumValue}`
            }${
              searchParamsRef.current[enumValue]
                ? `?${searchParamsRef.current[enumValue].toString()}`
                : ''
            }`,
          );
        }
      }}
      aria-label="Pipeline run page tabs"
      role="region"
      className="odh-pipeline-runs-page-tabs"
      data-testid="pipeline-runs-global-tabs"
      mountOnEnter
      unmountOnExit
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
