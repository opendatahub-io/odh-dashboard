import { MLflowPromptVersion } from '~/app/types';

export function DeepCopyPrompt(prompt: MLflowPromptVersion | null): MLflowPromptVersion | null {
  if (!prompt) {
    return null;
  }
  return {
    ...prompt,
    messages: prompt.messages?.map((m) => ({ ...m })),
    tags: prompt.tags ? { ...prompt.tags } : undefined,
    aliases: prompt.aliases ? [...prompt.aliases] : undefined,
  };
}
