import { TOOL_CALLING_VALIDATED_ARGS_VALUE } from '@odh-dashboard/internal/__mocks__/mockValidatedConfigurations';
import {
  formatValidatedOptionValueForDisplay,
  slugifyValidatedOptionTitle,
} from '../validatedConfigurationUtils';

describe('formatValidatedOptionValueForDisplay', () => {
  it('should format multi-line CLI args with line continuations', () => {
    expect(formatValidatedOptionValueForDisplay(TOOL_CALLING_VALIDATED_ARGS_VALUE)).toBe(
      '--enable-auto-tool-choice \\\n--tool-call-parser hermes \\\n--chat-template /etc/vllm/templates/tool_chat_template_hermes.jinja',
    );
  });
});

describe('slugifyValidatedOptionTitle', () => {
  it('should slugify option titles for test ids', () => {
    expect(slugifyValidatedOptionTitle('Tool calling')).toBe('tool-calling');
  });
});
