import * as React from 'react';
import { ApplicationsPage } from 'mod-arch-shared';
import {
  PageSection,
  Tabs,
  Tab,
  TabContent,
  TabContentBody,
  TabTitleText,
} from '@patternfly/react-core';
import AIAssetsEmptyState from './components/AIAssetsEmptyState';
import AIAssetsToolbar from './components/AIAssetsToolbar';

export const AIAssetsPage: React.FC = () => {
  const [activeTabKey, setActiveTabKey] = React.useState<string>('models');

  return (
    <ApplicationsPage
      title="AI asset endpoints"
      description="Browse endpoints for available models and MCP servers."
      loaded
      empty={false}
    >
      <PageSection hasBodyWrapper={false} type="tabs">
        <Tabs
          activeKey={activeTabKey}
          onSelect={(_, tabKey) => setActiveTabKey(String(tabKey))}
          aria-label="AI Assets tabs"
          role="region"
        >
          <Tab
            eventKey="models"
            title={<TabTitleText>Models</TabTitleText>}
            aria-label="Models tab"
            tabContentId="models-tab-content"
          />
        </Tabs>
      </PageSection>
      <PageSection hasBodyWrapper={false} isFilled>
        <AIAssetsToolbar />
        <TabContent
          id="models-tab-content"
          activeKey={activeTabKey}
          eventKey="models"
          hidden={activeTabKey !== 'models'}
        >
          <TabContentBody>
            <AIAssetsEmptyState message="No models available" />
          </TabContentBody>
        </TabContent>
      </PageSection>
    </ApplicationsPage>
  );
};
