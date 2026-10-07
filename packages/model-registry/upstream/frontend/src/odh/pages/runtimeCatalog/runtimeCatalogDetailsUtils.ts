import yaml from 'js-yaml';

export const formatRuntimeTemplate = (template: string | undefined, isSample: boolean): string => {
  if (!template) {
    return 'N/A';
  }
  const warning = isSample ? '# Example only. Not deployable.\n' : '';
  try {
    return warning + yaml.dump(JSON.parse(template), { lineWidth: -1, noRefs: true });
  } catch {
    return warning + template;
  }
};

export const formatRuntimePublishedDate = (publishedDate?: string): string | undefined => {
  if (!publishedDate) {
    return undefined;
  }
  const date = new Date(publishedDate);
  return Number.isNaN(date.getTime())
    ? undefined
    : date.toLocaleDateString('en-US', { dateStyle: 'long', timeZone: 'UTC' });
};
