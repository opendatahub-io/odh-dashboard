import yaml from 'js-yaml';

export const formatRuntimeTemplate = (template: string | undefined): string => {
  if (!template) {
    return 'N/A';
  }
  try {
    return yaml.dump(JSON.parse(template), { lineWidth: -1, noRefs: true });
  } catch {
    return template;
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
