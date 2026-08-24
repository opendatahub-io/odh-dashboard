import {
  TOOL_CALLING_VALIDATED_ARGS_VALUE,
  mockToolCallingValidatedConfiguration,
} from '@odh-dashboard/internal/__mocks__/mockValidatedConfigurations';
import {
  buildRuntimeArgsFromValidatedSelections,
  formatValidatedOptionValueForDisplay,
  getValidatedArgCommentHeader,
  hasValidatedConfigurationOptions,
  mergeValidatedOptionIntoArgs,
  optionValueToArgLines,
  removeValidatedOptionFromArgs,
  slugifyValidatedOptionTitle,
  toRuntimeArgsFieldData,
} from '../validatedConfigurationUtils';

describe('hasValidatedConfigurationOptions', () => {
  it('should return false when configurations are missing or empty', () => {
    expect(hasValidatedConfigurationOptions(undefined)).toBe(false);
    expect(hasValidatedConfigurationOptions([])).toBe(false);
  });

  it('should return false when every configuration has no options', () => {
    expect(
      hasValidatedConfigurationOptions([
        { ...mockToolCallingValidatedConfiguration(), options: [] },
      ]),
    ).toBe(false);
  });

  it('should return true when at least one configuration has options', () => {
    expect(hasValidatedConfigurationOptions([mockToolCallingValidatedConfiguration()])).toBe(true);
  });
});

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

describe('optionValueToArgLines', () => {
  it('should strip trailing backslashes and return individual arg lines', () => {
    expect(optionValueToArgLines(TOOL_CALLING_VALIDATED_ARGS_VALUE)).toEqual([
      '--enable-auto-tool-choice',
      '--tool-call-parser hermes',
      '--chat-template /etc/vllm/templates/tool_chat_template_hermes.jinja',
    ]);
  });
});

describe('mergeValidatedOptionIntoArgs / removeValidatedOptionFromArgs', () => {
  const option = mockToolCallingValidatedConfiguration().options[0];
  const header = getValidatedArgCommentHeader(option.title);

  it('should append comment header and arg lines when checking an option', () => {
    expect(mergeValidatedOptionIntoArgs([], option)).toEqual([
      header,
      '--enable-auto-tool-choice',
      '--tool-call-parser hermes',
      '--chat-template /etc/vllm/templates/tool_chat_template_hermes.jinja',
    ]);
  });

  it('should not duplicate when the header is already present', () => {
    const existing = mergeValidatedOptionIntoArgs([], option);
    expect(mergeValidatedOptionIntoArgs(existing, option)).toEqual(existing);
  });

  it('should remove only known validated lines and preserve user edits', () => {
    const withUserEdits = [
      '--my-custom-arg',
      header,
      '--enable-auto-tool-choice',
      '--tool-call-parser hermes',
      '--chat-template /etc/vllm/templates/tool_chat_template_hermes.jinja',
      '--another-user-arg',
    ];

    expect(removeValidatedOptionFromArgs(withUserEdits, option)).toEqual([
      '--my-custom-arg',
      '--another-user-arg',
    ]);
  });

  it('should leave user-edited validated lines that no longer match exactly', () => {
    const withEditedLine = [
      header,
      '--enable-auto-tool-choice=true',
      '--tool-call-parser hermes',
      '--chat-template /etc/vllm/templates/tool_chat_template_hermes.jinja',
    ];

    expect(removeValidatedOptionFromArgs(withEditedLine, option)).toEqual([
      '--enable-auto-tool-choice=true',
    ]);
  });

  it('should set enabled false when no args remain', () => {
    const merged = mergeValidatedOptionIntoArgs([], option);
    expect(toRuntimeArgsFieldData(removeValidatedOptionFromArgs(merged, option))).toEqual({
      enabled: false,
      args: [],
    });
  });

  it('should preserve duplicate user args outside the validated block', () => {
    const withDuplicateUserArg = [
      '--enable-auto-tool-choice',
      header,
      '--enable-auto-tool-choice',
      '--tool-call-parser hermes',
      '--chat-template /etc/vllm/templates/tool_chat_template_hermes.jinja',
    ];

    expect(removeValidatedOptionFromArgs(withDuplicateUserArg, option)).toEqual([
      '--enable-auto-tool-choice',
    ]);
  });

  it('should preserve overlapping args that belong to another validated block', () => {
    const otherOption = {
      title: 'Other calling',
      description: 'Another validated configuration',
      value: '--enable-auto-tool-choice \\\n--other-flag',
    };
    const otherHeader = getValidatedArgCommentHeader(otherOption.title);
    const args = [
      header,
      '--enable-auto-tool-choice',
      '--tool-call-parser hermes',
      '--chat-template /etc/vllm/templates/tool_chat_template_hermes.jinja',
      otherHeader,
      '--enable-auto-tool-choice',
      '--other-flag',
    ];

    expect(removeValidatedOptionFromArgs(args, option)).toEqual([
      otherHeader,
      '--enable-auto-tool-choice',
      '--other-flag',
    ]);
  });
});

describe('buildRuntimeArgsFromValidatedSelections', () => {
  it('should return undefined when nothing is selected', () => {
    expect(
      buildRuntimeArgsFromValidatedSelections([mockToolCallingValidatedConfiguration()], {}),
    ).toBeUndefined();
  });

  it('should seed runtime args from selected validated configurations', () => {
    const configuration = mockToolCallingValidatedConfiguration();
    const option = configuration.options[0];

    expect(
      buildRuntimeArgsFromValidatedSelections([configuration], {
        args: [option.value],
      }),
    ).toEqual({
      enabled: true,
      args: [
        getValidatedArgCommentHeader(option.title),
        '--enable-auto-tool-choice',
        '--tool-call-parser hermes',
        '--chat-template /etc/vllm/templates/tool_chat_template_hermes.jinja',
      ],
    });
  });
});
