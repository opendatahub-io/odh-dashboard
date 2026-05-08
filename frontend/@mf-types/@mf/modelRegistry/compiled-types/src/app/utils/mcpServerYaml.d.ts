import type { MCPServerCR } from '~/app/mcpDeploymentTypes';
/**
 * Extracts the editable portion of the MCPServer CR spec (config + runtime)
 * and serializes it to a YAML string for display in the deploy modal editor.
 *
 * Uses js-yaml for robust serialization that handles edge cases
 * (multiline strings, special YAML scalars like yes/no/on/off, etc.).
 */
export declare const mcpServerCRToYaml: (cr: MCPServerCR) => string;
