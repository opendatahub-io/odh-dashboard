import type { MCPServerCR } from '~/app/mcpDeploymentTypes';

const indent = (level: number): string => '  '.repeat(level);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const serializeValue = (value: unknown, level: number): string => {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    if (
      value.includes(':') ||
      value.includes('#') ||
      value.includes('"') ||
      value.includes("'") ||
      value.includes('\n') ||
      value.startsWith('<') ||
      value.startsWith(' ') ||
      value.endsWith(' ')
    ) {
      return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
    }
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    return `\n${value
      .map((item) => {
        if (isRecord(item)) {
          const entries = Object.entries(item).filter(([, v]) => v !== undefined && v !== null);
          if (entries.length === 0) {
            return `${indent(level)}- {}`;
          }
          const [firstKey, firstVal] = entries[0];
          const firstLine = `${indent(level)}- ${firstKey}: ${serializeValue(firstVal, level + 2)}`;
          const restLines = entries
            .slice(1)
            .map(([k, v]) => `${indent(level + 1)}${k}: ${serializeValue(v, level + 2)}`);
          return [firstLine, ...restLines].join('\n');
        }
        return `${indent(level)}- ${serializeValue(item, level + 1)}`;
      })
      .join('\n')}`;
  }
  if (isRecord(value)) {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined && v !== null);
    if (entries.length === 0) {
      return '{}';
    }
    return `\n${entries.map(([k, v]) => `${indent(level)}${k}: ${serializeValue(v, level + 1)}`).join('\n')}`;
  }
  return '';
};

/**
 * Extracts the editable portion of the MCPServer CR spec (config + runtime)
 * and serializes it to a YAML string for display in the deploy modal editor.
 */
export const mcpServerCRToYaml = (cr: MCPServerCR): string => {
  const editableSpec: Record<string, unknown> = {};

  if (cr.spec.runtime) {
    editableSpec.runtime = cr.spec.runtime;
  }
  editableSpec.config = cr.spec.config;

  const lines = Object.entries(editableSpec)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${indent(1)}${k}: ${serializeValue(v, 2)}`);

  return `spec:\n${lines.join('\n')}\n`;
};
