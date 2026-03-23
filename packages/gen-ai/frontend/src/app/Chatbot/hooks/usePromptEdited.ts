import { useChatbotConfigStore, selectSystemInstruction } from '~/app/Chatbot/store';
import { usePlaygroundStore } from '~/app/Chatbot/store/usePlaygroundStore';
import { DEFAULT_SYSTEM_INSTRUCTIONS } from '~/app/Chatbot/const';

export function usePromptEdited(): boolean {
  const systemInstruction = useChatbotConfigStore(selectSystemInstruction('default'));
  const { activePrompt } = usePlaygroundStore();

  const activeTemplate =
    activePrompt?.template ??
    activePrompt?.messages?.find((m) => m.role === 'system')?.content ??
    '';

  // If no prompt is loaded, only consider edited if user deviated from the default
  if (!activePrompt) {
    return systemInstruction !== DEFAULT_SYSTEM_INSTRUCTIONS;
  }

  return systemInstruction !== activeTemplate;
}
