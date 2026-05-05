import yaml from 'js-yaml';
import type { MCPServerCR } from '~/odh/types/mcpDeploymentTypes';

/**
 * Extracts the editable portion of the MCPServer CR spec (config + runtime)
 * and serializes it to a YAML string for display in the deploy modal editor.
 *
 * Uses js-yaml for robust serialization that handles edge cases
 * (multiline strings, special YAML scalars like yes/no/on/off, etc.).
 */
export const mcpServerCRToYaml = (cr: MCPServerCR): string => {
  const editableSpec: Record<string, unknown> = {};

  if (cr.spec.runtime) {
    editableSpec.runtime = cr.spec.runtime;
  }
  editableSpec.config = cr.spec.config;

  return yaml.dump(editableSpec, { lineWidth: -1, noRefs: true });
};
