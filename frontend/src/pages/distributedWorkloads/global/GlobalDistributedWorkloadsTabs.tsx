import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Tabs, Tab, TabTitleText, PageSection } from '@patternfly/react-core';
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
              const namespaceSuffix = tab.projectSelectorMode && !!namespace ? `/${namespace}` : '';
              navigate(`/distributedWorkloads/${tab.path}${namespaceSuffix}`);
            }
          }}
          aria-label="Workload metrics page tabs"
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
      {activeTab && <activeTab.ContentComponent tabConfig={activeTab} />}
    </>
  );
};

export default GlobalDistributedWorkloadsTabs;
