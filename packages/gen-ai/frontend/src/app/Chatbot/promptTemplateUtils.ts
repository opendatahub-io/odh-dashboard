const TEMPLATE_VARIABLE_REGEX = /\{\{\s*([a-zA-Z_]\w*)\s*\}\}/g;

/**
 * Extracts unique variable names from {{variable}} placeholders in a template string.
 * Handles deduplication, optional whitespace inside braces, and ignores malformed patterns.
 */
export const extractTemplateVariables = (template: string): string[] => {
  if (!template) {
    return [];
  }

  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = TEMPLATE_VARIABLE_REGEX.exec(template)) !== null) {
    seen.add(match[1]);
  }

  return Array.from(seen);
};

/**
 * Replaces all {{variable}} placeholders in a template with the supplied values.
 * Unmatched variables (no value provided or empty string) are left as-is.
 * Returns the original string unchanged when values is empty or template has no placeholders.
 */
export const substituteTemplateVariables = (
  template: string,
  values: Record<string, string>,
): string => {
  if (!template || Object.keys(values).length === 0) {
    return template || '';
  }

  return template.replace(TEMPLATE_VARIABLE_REGEX, (match, name: string) =>
    name in values && values[name] !== '' ? values[name] : match,
  );
};
