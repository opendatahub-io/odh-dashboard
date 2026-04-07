import {
  useChatbotConfigStore,
  selectSystemInstruction,
  selectActivePrompt,
} from '~/app/Chatbot/store';
import { DEFAULT_SYSTEM_INSTRUCTIONS } from '~/app/Chatbot/const';

export function usePromptEdited(configId: string): boolean {
  const systemInstruction = useChatbotConfigStore(selectSystemInstruction(configId));
  const activePrompt = useChatbotConfigStore(selectActivePrompt(configId));

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
