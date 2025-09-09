import * as React from 'react';
import { ApplicationsPage } from 'mod-arch-shared';
import {
  PageSection,
  Tabs,
  Tab,
  TabContent,
  TabContentBody,
  TabTitleText,
  FlexItem,
  Flex,
} from '@patternfly/react-core';
import ProjectIcon from '@odh-dashboard/internal/images/icons/ProjectIcon';
import ProjectDropdown from '~/app/Chatbot/components/ProjectDropdown';
import { useProject } from '~/app/context';
import AIAssetsEmptyState from './components/AIAssetsEmptyState';
import AIAssetsToolbar from './components/AIAssetsToolbar';
import MCPServersPage from './MCPServersPage';

export const AIAssetsPage: React.FC = () => {
  const { isLoading: projectLoading, setSelectedProject } = useProject();
  const [activeTabKey, setActiveTabKey] = React.useState<string>('mcpservers');

  return (
    <ApplicationsPage
      title="AI asset endpoints"
      description="Browse endpoints for available models and MCP servers."
      loaded
      empty={false}
    >
      <Flex
        style={{ marginLeft: '10px' }}
        component="span"
        alignItems={{ default: 'alignItemsCenter' }}
        gap={{ default: 'gapLg' }}
      >
        <FlexItem>
          <Flex
            spaceItems={{ default: 'spaceItemsXs' }}
            alignItems={{ default: 'alignItemsCenter' }}
            style={{ display: 'inline-flex' }}
          >
            <FlexItem>
              <ProjectIcon style={{ width: '20px', height: '20px', marginLeft: '10px' }} />
            </FlexItem>
            <FlexItem>
              <span style={{ fontSize: '16px', marginRight: '10px' }}>Project</span>
            </FlexItem>
            <FlexItem>
              <ProjectDropdown onProjectChange={setSelectedProject} isDisabled={projectLoading} />
            </FlexItem>
          </Flex>
        </FlexItem>
      </Flex>
      <PageSection>
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
          <Tab
            eventKey="mcpservers"
            title={<TabTitleText>MCP Servers</TabTitleText>}
            aria-label="MCP Servers tab"
            tabContentId="mcpservers-tab-content"
          />
        </Tabs>
      </PageSection>
      <PageSection hasBodyWrapper={false} isFilled>
        <TabContent
          id="models-tab-content"
          activeKey={activeTabKey}
          eventKey="models"
          hidden={activeTabKey !== 'models'}
        >
          <TabContentBody>
            <AIAssetsToolbar />
            <AIAssetsEmptyState message="No models available" />
          </TabContentBody>
        </TabContent>
        <TabContent
          id="mcpservers-tab-content"
          activeKey={activeTabKey}
          eventKey="mcpservers"
          hidden={activeTabKey !== 'mcpservers'}
        >
          <TabContentBody>
            <MCPServersPage />
          </TabContentBody>
        </TabContent>
      </PageSection>
    </ApplicationsPage>
  );
};
