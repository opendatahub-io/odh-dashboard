import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Tabs,
  Tab,
  TabTitleText,
  PageSection,
  TabContent,
  TabContentBody,
} from '@patternfly/react-core';
import MetricsPageToolbar from '~/concepts/metrics/MetricsPageToolbar';
import {
  DistributedWorkloadsTabId,
  useDistributedWorkloadsTabs,
} from './useDistributedWorkloadsTabs';

type GlobalDistributedWorkloadsTabsProps = {
  activeTabId: DistributedWorkloadsTabId;
};

const GlobalDistributedWorkloadsTabs: React.FC<GlobalDistributedWorkloadsTabsProps> = ({
  activeTabId,
}) => {
  const navigate = useNavigate();
  const tabs = useDistributedWorkloadsTabs();
  const activeTab = tabs.find(({ id }) => id === activeTabId);
  const { namespace } = useParams<{ namespace: string }>();
  return (
    <>
      <PageSection variant="light" type="tabs">
        <Tabs
          activeKey={activeTabId}
          onSelect={(_, tabId) => {
            const tab = tabs.find(({ id }) => id === tabId);
            if (tab) {
              const namespaceSuffix = namespace ? `/${namespace}` : '';
              navigate(`/distributedWorkloads/${tab.path}${namespaceSuffix}`);
            }
          }}
          aria-label="Distributed workload metrics page tabs"
          role="region"
        >
          {tabs
            .filter((tab) => tab.isAvailable)
            .map((tab) => (
              <Tab
                key={tab.id}
                eventKey={tab.id}
                title={<TabTitleText>{tab.title}</TabTitleText>}
                aria-label={`${tab.title} tab`}
                tabContentId={`${tab.id}-tab-content`}
              />
            ))}
        </Tabs>
      </PageSection>
      {activeTab ? <MetricsPageToolbar hasTimeRangeSelect={false} /> : null}
      <PageSection isFilled>
        {tabs
          .filter((tab) => tab.isAvailable)
          .map((tab) => {
            const isActiveTab = tab.id === activeTab?.id;
            return (
              <TabContent
                id={`${tab.id}-tab-content`}
                activeKey={tab.id}
                eventKey={tab.id}
                key={tab.id}
                hidden={!isActiveTab}
              >
                <TabContentBody>{isActiveTab ? <tab.ContentComponent /> : null}</TabContentBody>
              </TabContent>
            );
          })}
      </PageSection>
    </>
  );
};

export default GlobalDistributedWorkloadsTabs;
