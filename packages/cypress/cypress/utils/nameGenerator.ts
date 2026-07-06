const DSP_PREFIX = 'dsp-';

/**
 * Derives a workbench name from a project namespace by replacing the
 * standard 'dsp-' prefix with an optional custom prefix.
 */
export const deriveWorkbenchName = (namespaceName: string, prefix = ''): string =>
  namespaceName.replace(DSP_PREFIX, prefix);
