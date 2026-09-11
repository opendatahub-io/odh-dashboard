import type { ValidatedConfiguration } from '@odh-dashboard/model-serving/shared';

export const TOOL_CALLING_VALIDATED_ARGS_VALUE = [
  '--enable-auto-tool-choice',
  '--tool-call-parser hermes',
  '--chat-template /etc/vllm/templates/tool_chat_template_hermes.jinja',
].join(' \\\n');

export const mockToolCallingValidatedConfiguration = (): ValidatedConfiguration => ({
  forField: 'args',
  title: 'Validated arguments',
  description:
    'This model has runtime configurations that have been tested and validated by Red Hat. Selected configurations will be applied as runtime arguments in your deployment.',
  options: [
    {
      title: 'Tool calling',
      description:
        'Allows the model to call external tools and APIs, enabling it to take actions like querying databases or running code.',
      value: TOOL_CALLING_VALIDATED_ARGS_VALUE,
    },
  ],
});
