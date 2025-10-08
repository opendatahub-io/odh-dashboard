import * as React from 'react';
import { genAiChatPlaygroundRoute } from '~/app/utilities/routes';
import GenAiCoreHeader from '~/app/GenAiCoreHeader';
import PlaygroundIcon from '~/app/images/icons/PlaygroundIcon';

const ChatbotHeader: React.FC = () => (
  // TODO: add ViewCode component and align it right
  <GenAiCoreHeader
    title="Playground"
    icon={PlaygroundIcon}
    getRedirectPath={genAiChatPlaygroundRoute}
  />
);
export default ChatbotHeader;
