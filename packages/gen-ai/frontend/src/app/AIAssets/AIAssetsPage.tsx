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
import GenAiCoreHeader from '~/app/GenAiCoreHeader';
import { genAiAiAssetsRoute } from '~/app/utilities/routes';
import AIAssetsModelsTab from './AIAssetsModelsTab';

enum AIAssetsPageTabKey {
  MODELS = 'models',
}

export const AIAssetsPage: React.FC = () => {
  const [activeTabKey, setActiveTabKey] = React.useState<string>(AIAssetsPageTabKey.MODELS);

  return (
    <ApplicationsPage
      title={
        <GenAiCoreHeader
          title="AI asset endpoints"
          getRedirectPath={genAiAiAssetsRoute}
          description="Browse endpoints for available models and MCP servers."
        />
      }
      loaded
      empty={false}
    >
      <PageSection>
        <Tabs
          activeKey={activeTabKey}
          onSelect={(_, tabKey) => setActiveTabKey(String(tabKey))}
          aria-label="AI Assets tabs"
          role="region"
        >
          <Tab
            eventKey={AIAssetsPageTabKey.MODELS}
            title={<TabTitleText>Models</TabTitleText>}
            aria-label="Models tab"
            tabContentId="models-tab-content"
          />
        </Tabs>
      </PageSection>
      <PageSection>
        <TabContent
          id="models-tab-content"
          activeKey={activeTabKey}
          eventKey={AIAssetsPageTabKey.MODELS}
          hidden={activeTabKey !== AIAssetsPageTabKey.MODELS}
        >
          <TabContentBody>
            <AIAssetsModelsTab />
          </TabContentBody>
        </TabContent>
      </PageSection>
    </ApplicationsPage>
  );
};
