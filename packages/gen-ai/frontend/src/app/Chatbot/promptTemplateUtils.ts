const TEMPLATE_VARIABLE_REGEX = /\{\{\s*([a-zA-Z_]\w*)\s*\}\}/g;

/**
 * Extracts unique variable names from {{variable}} placeholders in a template string.
 * Handles deduplication, optional whitespace inside braces, and ignores malformed patterns.
 */
export function extractTemplateVariables(template: string): string[] {
  if (!template) {
    return [];
  }

  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = TEMPLATE_VARIABLE_REGEX.exec(template)) !== null) {
    seen.add(match[1]);
  }

  return Array.from(seen);
}

/**
 * Replaces all {{variable}} placeholders in a template with the supplied values.
 * Variables without a supplied value are replaced with an empty string.
 * Returns the original string unchanged when template has no placeholders.
 */
export function substituteTemplateVariables(
  template: string,
  values: Record<string, string>,
): string {
  if (!template) {
    return template || '';
  }

  return template.replace(TEMPLATE_VARIABLE_REGEX, (_match, name: string) =>
    Object.hasOwn(values, name) ? values[name] : '',
  );
}
