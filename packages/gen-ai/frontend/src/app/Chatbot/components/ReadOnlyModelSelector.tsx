import * as React from 'react';
import { useChatbotConfigStore, selectSelectedModel } from '~/app/Chatbot/store';
import ModelDetailsDropdown from './ModelDetailsDropdown';

type ReadOnlyModelSelectorProps = {
  configId: string;
};

const ReadOnlyModelSelector: React.FC<ReadOnlyModelSelectorProps> = ({ configId }) => {
  const selectedModel = useChatbotConfigStore(selectSelectedModel(configId));
  const updateSelectedModel = useChatbotConfigStore((state) => state.updateSelectedModel);

  return (
    <ModelDetailsDropdown
      selectedModel={selectedModel}
      onModelChange={(model) => updateSelectedModel(configId, model)}
      style={{ minWidth: '18rem' }}
      testId="grid-read-only-model-selector"
    />
  );
};

export default ReadOnlyModelSelector;
