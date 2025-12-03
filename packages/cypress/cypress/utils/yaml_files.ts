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
    // Handle both {{var}} and { { var } } formats using regex
    const regex = new RegExp(`\\{\\s*{\\s*${key}\\s*}\\s*}`, 'g');
    modifiedYaml = modifiedYaml.replace(regex, value);
  }
  return modifiedYaml;
};
