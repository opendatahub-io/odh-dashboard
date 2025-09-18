import * as React from 'react';
import { useModularArchContext } from 'mod-arch-core/dist/hooks/useModularArchContext';
import { Flex } from '@patternfly/react-core';
import { DeploymentMode } from 'mod-arch-core';
import { ChatbotContextProvider } from '~/app/context/ChatbotContext';
import { GenAiContext } from '~/app/context/GenAiContext';
import { ChatbotMain } from './ChatbotMain';

const ChatbotPage: React.FC = () => {
  const { config } = useModularArchContext();
  const { namespace } = React.useContext(GenAiContext);
  const isStandalone = config.deploymentMode === DeploymentMode.Standalone;

  return (
    <ChatbotContextProvider namespace={namespace}>
      {isStandalone ? (
        <ChatbotMain />
      ) : (
        // In federated mode, DrawerBody is not flex which the Page items expect the parent to be.
        // This is a workaround to make the drawer body flex.
        <Flex
          direction={{ default: 'column' }}
          flexWrap={{ default: 'nowrap' }}
          style={{ height: '100%' }}
        >
          <ChatbotMain />
        </Flex>
      )}
    </ChatbotContextProvider>
  );
};

export default ChatbotPage;
