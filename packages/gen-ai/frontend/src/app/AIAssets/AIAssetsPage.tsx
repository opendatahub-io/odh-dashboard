import * as React from 'react';
import { useNavigate } from 'react-router-dom';
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
import ModelsEmptyState from '~/app/EmptyStates/NoData';

enum AIAssetsPageTabKey {
  MODELS = 'models',
}

export const AIAssetsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTabKey, setActiveTabKey] = React.useState<string>(AIAssetsPageTabKey.MODELS);

  return (
    <ApplicationsPage
      title="AI asset endpoints"
      description="Browse endpoints for available models and MCP servers."
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
            <ModelsEmptyState
              title="To begin you must deploy a model"
              description={
                <Content
                  style={{
                    textAlign: 'left',
                  }}
                >
                  Looks like your project is missing at least one model to use the playground.
                  Follow the steps below to deploy a model and get started.
                  <Content
                    component={ContentVariants.ol}
                    style={{ marginTop: 'var(--pf-t--global--spacer--sm)' }}
                  >
                    <Content component={ContentVariants.li}>
                      Go to your <b>Model Deployments</b> page
                    </Content>
                    <Content component={ContentVariants.li}>
                      Select <b>&apos;Edit&apos;</b> to update your deployment
                    </Content>
                    <Content component={ContentVariants.li}>
                      Check the box:{' '}
                      <b>&apos;Make this deployment available as an AI asset&apos;</b>
                    </Content>
                  </Content>
                </Content>
              }
              actionButtonText="Go to Model Deployments"
              handleActionButtonClick={() => {
                navigate('/modelServing');
              }}
            />
          </TabContentBody>
        </TabContent>
      </PageSection>
    </ApplicationsPage>
  );
};
