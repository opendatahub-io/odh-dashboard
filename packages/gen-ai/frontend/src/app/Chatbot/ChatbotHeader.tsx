import * as React from 'react';
import { genAiChatPlaygroundRoute } from '~/app/utilities/routes';
import GenAiCoreHeader from '~/app/GenAiCoreHeader';

const ChatbotHeader: React.FC = () => (
  // TODO: add ViewCode component and align it right
  <GenAiCoreHeader title="Chat playground" getRedirectPath={genAiChatPlaygroundRoute} />
);
export default ChatbotHeader;
