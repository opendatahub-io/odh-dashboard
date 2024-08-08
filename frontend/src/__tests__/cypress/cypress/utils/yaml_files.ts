/**
 * Replaces placeholders in a YAML content with environment variable values.
 *
 * @param yamlContent YAML content as a string
 * @param replacements Object containing placeholder keys and their corresponding replacement values
 * @returns Modified YAML content
 */
export const replacePlaceholdersInYaml = (
  yamlContent: string,
  replacements: { [key: string]: string },
): string => {
  let modifiedYaml = yamlContent;
  for (const [key, value] of Object.entries(replacements)) {
    const placeholder = `{{${key}}}`;
    modifiedYaml = modifiedYaml.split(placeholder).join(value);
  }
  return modifiedYaml;
};
