import { useChatbotConfigStore, selectSystemInstruction } from '~/app/Chatbot/store';
import { usePlaygroundStore } from '~/app/Chatbot/store/usePlaygroundStore';

export function usePromptEdited(): boolean {
  const systemInstruction = useChatbotConfigStore(selectSystemInstruction('default'));
  const { activePrompt } = usePlaygroundStore();

  const activeTemplate =
    activePrompt?.template ??
    activePrompt?.messages?.find((m) => m.role === 'system')?.content ??
    '';

  return systemInstruction !== activeTemplate;
}
