import type {
  RuntimeArgsFieldData,
  ValidatedConfiguration,
  ValidatedConfigurationOption,
} from '../../../../shared/types/form-data';

/**
 * Formats a validated configuration option value for display in the "View arguments" popover.
 * Normalizes line-continuation backslashes while preserving individual CLI arguments.
 */
export const formatValidatedOptionValueForDisplay = (value: string): string =>
  value
    .split('\n')
    .map((line) => line.replace(/\\$/, '').trim())
    .filter(Boolean)
    .join(' \\\n');

export const slugifyValidatedOptionTitle = (title: string): string =>
  title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const VALIDATED_ARG_HEADER_PREFIX = '# Validated arguments for ';

export const getValidatedArgCommentHeader = (optionTitle: string): string =>
  `${VALIDATED_ARG_HEADER_PREFIX}${optionTitle}`;

/** Converts an option value into runtime-arg textarea lines (no shell `\` continuations). */
export const optionValueToArgLines = (value: string): string[] =>
  value
    .split('\n')
    .map((line) => line.replace(/\\$/, '').trim())
    .filter(Boolean);

export const getValidatedOptionArgBlock = (option: ValidatedConfigurationOption): string[] => [
  getValidatedArgCommentHeader(option.title),
  ...optionValueToArgLines(option.value),
];

export const toRuntimeArgsFieldData = (args: string[]): RuntimeArgsFieldData => ({
  enabled: args.length > 0,
  args,
});

/**
 * Appends a validated option's comment header + arg lines. No-op if the header is already present.
 */
export const mergeValidatedOptionIntoArgs = (
  currentArgs: string[],
  option: ValidatedConfigurationOption,
): string[] => {
  const header = getValidatedArgCommentHeader(option.title);
  if (currentArgs.includes(header)) {
    return currentArgs;
  }
  return [...currentArgs, ...getValidatedOptionArgBlock(option)];
};

/**
 * Removes only this option's validated block (header + expected arg lines).
 * Preserves identical lines before the header, after the block, or in other
 * validated blocks — including duplicate user args and overlapping option args.
 */
export const removeValidatedOptionFromArgs = (
  currentArgs: string[],
  option: ValidatedConfigurationOption,
): string[] => {
  const header = getValidatedArgCommentHeader(option.title);
  const remainingLines = new Map<string, number>();

  for (const line of optionValueToArgLines(option.value)) {
    remainingLines.set(line, (remainingLines.get(line) ?? 0) + 1);
  }

  let inTargetBlock = false;
  return currentArgs.filter((line) => {
    if (line === header) {
      inTargetBlock = true;
      return false;
    }
    if (inTargetBlock && line.startsWith(VALIDATED_ARG_HEADER_PREFIX)) {
      inTargetBlock = false;
    }
    if (!inTargetBlock) {
      return true;
    }

    const count = remainingLines.get(line) ?? 0;
    if (count === 0) {
      return true;
    }
    remainingLines.set(line, count - 1);
    return false;
  });
};

/**
 * Seeds runtime args from initially selected validated configurations (e.g. catalog deploy).
 * Returns undefined when nothing is selected so the runtime-args hook keeps its empty default.
 */
export const buildRuntimeArgsFromValidatedSelections = (
  configurations: ValidatedConfiguration[] | undefined,
  selected: Record<string, string[]> | undefined,
): RuntimeArgsFieldData | undefined => {
  if (!configurations?.length || !selected) {
    return undefined;
  }

  let args: string[] = [];
  for (const configuration of configurations) {
    if (configuration.forField !== 'args') {
      continue;
    }
    const selectedValues = selected[configuration.forField] ?? [];
    for (const option of configuration.options) {
      if (selectedValues.includes(option.value)) {
        args = mergeValidatedOptionIntoArgs(args, option);
      }
    }
  }

  if (args.length === 0) {
    return undefined;
  }

  return toRuntimeArgsFieldData(args);
};
