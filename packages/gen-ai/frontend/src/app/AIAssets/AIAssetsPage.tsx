import * as React from 'react';
import { ApplicationsPage } from 'mod-arch-shared';
import {
  PageSection,
  Tabs,
  Tab,
  TabContent,
  TabContentBody,
  TabTitleText,
  Content,
  ContentVariants,
} from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { useNamespaceSelector } from 'mod-arch-core';
import GenAiCoreHeader from '~/app/GenAiCoreHeader';
import { genAiAiAssetsRoute } from '~/app/utilities/routes';
import NoData from '~/app/EmptyStates/NoData';
import AIAssetsModelsTab from './AIAssetsModelsTab';

enum AIAssetsPageTabKey {
  MODELS = 'models',
}

export const AIAssetsPage: React.FC = () => {
  const navigate = useNavigate();
  const { namespaces, namespacesLoaded } = useNamespaceSelector();
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
      loaded={namespacesLoaded}
      empty={namespaces.length === 0}
      emptyStatePage={
        <NoData
          title="You must create a project to begin"
          description={
            <Content
              style={{
                textAlign: 'left',
              }}
            >
              <Content component="p">To create a project:</Content>
              <Content component={ContentVariants.ol}>
                <Content component={ContentVariants.li}>
                  Go to the <b>Projects</b> page
                </Content>
                <Content component={ContentVariants.li}>
                  Select <b>Create new project</b>
                </Content>
                <Content component={ContentVariants.li}>
                  Complete the steps to create a project then come back here
                </Content>
              </Content>
            </Content>
          }
          actionButtonText="Go to Projects page"
          handleActionButtonClick={() => navigate('/projects')}
        />
      }
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
