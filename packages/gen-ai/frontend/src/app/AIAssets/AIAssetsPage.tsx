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
import { GenAiContext } from '~/app/context/GenAiContext';
import useFetchLlamaModels from '~/app/hooks/useFetchLlamaModels';
import { useMCPServers } from '~/app/hooks/useMCPServers';
import useFetchAIModels from '~/app/hooks/useFetchAIModels';
import AIAssetsModelsTab from './AIAssetsModelsTab';
import AIAssetsMCPTabWithContext from './AIAssetsMCPTabWithContext';

enum AIAssetsPageTabKey {
  MODELS = 'models',
  MCP_SERVERS = 'mcpservers',
}

export const AIAssetsPage: React.FC = () => {
  const [activeTabKey, setActiveTabKey] = React.useState<string>(AIAssetsPageTabKey.MODELS);
  const { namespace } = React.useContext(GenAiContext);
  const { data: playgroundModels } = useFetchLlamaModels(namespace?.name);
  const { data: models, loaded, error } = useFetchAIModels(namespace?.name);
  const { servers: mcpServers, serversLoaded: mcpServersLoaded } = useMCPServers(
    namespace?.name || '',
    { autoCheckStatuses: false },
  );
  const modelsCount = models.length;
  const mcpServersCount = mcpServers.length;

  return (
    <ApplicationsPage
      title={<GenAiCoreHeader title="AI asset endpoints" getRedirectPath={genAiAiAssetsRoute} />}
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
            title={<TabTitleText>Models {loaded && `(${modelsCount})`}</TabTitleText>}
            aria-label="Models tab"
            tabContentId="models-tab-content"
          />
          <Tab
            eventKey={AIAssetsPageTabKey.MCP_SERVERS}
            title={
              <TabTitleText>MCP Servers {mcpServersLoaded && `(${mcpServersCount})`}</TabTitleText>
            }
            aria-label="MCP Servers tab"
            tabContentId="mcpservers-tab-content"
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
            <AIAssetsModelsTab
              models={models}
              playgroundModels={playgroundModels}
              namespace={namespace}
              loaded={loaded}
              error={error}
            />
          </TabContentBody>
        </TabContent>
        <TabContent
          id="mcpservers-tab-content"
          activeKey={activeTabKey}
          eventKey={AIAssetsPageTabKey.MCP_SERVERS}
          hidden={activeTabKey !== AIAssetsPageTabKey.MCP_SERVERS}
        >
          <TabContentBody>
            {activeTabKey === AIAssetsPageTabKey.MCP_SERVERS && <AIAssetsMCPTabWithContext />}
          </TabContentBody>
        </TabContent>
      </PageSection>
    </ApplicationsPage>
  );
};
