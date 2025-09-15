import * as React from 'react';
import { useModularArchContext } from 'mod-arch-core/dist/hooks/useModularArchContext';
import { Flex } from '@patternfly/react-core';
import { ApplicationsPage } from 'mod-arch-shared';
import { DeploymentMode } from 'mod-arch-core';
import ChatbotEmptyState from '~/app/EmptyStates/NoData';
import useFetchLSDStatus from '~/app/hooks/useFetchLSDStatus';
import { GenAiContext } from '~/app/context/GenAiContext';
import ChatbotHeader from '~/app/Chatbot/ChatbotHeader';

type ChatbotCoreLoaderProps = {
  children: React.ReactNode;
};

const ChatbotCoreLoader: React.FC<ChatbotCoreLoaderProps> = ({ children }) => {
  const { namespace } = React.useContext(GenAiContext);
  const { config } = useModularArchContext();
  const isStandalone = config.deploymentMode === DeploymentMode.Standalone;

  const {
    data: lsdStatusData,
    loaded: lsdStatusLoaded,
    error: lsdStatusError,
  } = useFetchLSDStatus(namespace?.name ?? '');

  const applicationsPage = (
    <ApplicationsPage
      title={<ChatbotHeader />}
      loaded={lsdStatusLoaded}
      empty={!lsdStatusData}
      emptyStatePage={
        <ChatbotEmptyState
          title="Enable Playground"
          description="Create a playground to chat with the generative models deployed in this project. Experiment with model output using a simple RAG simulation, custom prompt and MCP servers."
          actionButtonText="Configure playground"
          handleActionButtonClick={() => {
            // TODO: Implement
          }}
        />
      }
      loadError={lsdStatusError}
    >
      {children}
    </ApplicationsPage>
  );

  return isStandalone ? (
    applicationsPage
  ) : (
    // In federated mode, DrawerBody is not flex which the Page items expect the parent to be.
    // This is a workaround to make the drawer body flex.
    <Flex
      direction={{ default: 'column' }}
      flexWrap={{ default: 'nowrap' }}
      style={{ height: '100%' }}
    >
      {applicationsPage}
    </Flex>
  );
};

export default ChatbotCoreLoader;
