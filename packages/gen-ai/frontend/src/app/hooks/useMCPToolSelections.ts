import * as React from 'react';
import { useBrowserStorage } from 'mod-arch-core';

type ToolSelectionsMap = Record<string, Record<string, string[]> | undefined>;

/**
 * Hook to manage MCP tool selections per namespace and server using sessionStorage
 *
 * Storage structure:
 * {
 *   "namespace-name": {
 *     "http://server-url": ["tool1", "tool2"]
 *   }
 * }
 */
export const useMCPToolSelections = (): {
  getToolSelections: (namespace: string, serverUrl: string) => string[] | undefined;
  saveToolSelections: (
    namespace: string,
    serverUrl: string,
    toolNames: string[] | undefined,
  ) => void;
} => {
  const [selections, setSelections] = useBrowserStorage<ToolSelectionsMap>(
    'mcp-tool-selections',
    {},
    true, // jsonify
    true, // isSessionStorage
  );

  /**
   * Get saved tool selections for a specific namespace and server
   * @returns undefined if never saved (= ALL tools allowed), or array of tool names
   */
  const getToolSelections = React.useCallback(
    (namespace: string, serverUrl: string): string[] | undefined =>
      selections[namespace]?.[serverUrl],
    [selections],
  );

  /**
   * Save tool selections for a specific namespace and server
   * @param toolNames - Array of tool names, or undefined to remove entry (= ALL tools allowed)
   */
  const saveToolSelections = React.useCallback(
    (namespace: string, serverUrl: string, toolNames: string[] | undefined): void => {
      if (toolNames === undefined) {
        const namespaceSelections = { ...selections[namespace] };
        delete namespaceSelections[serverUrl];

        setSelections({
          ...selections,
          [namespace]: namespaceSelections,
        });
      } else {
        setSelections({
          ...selections,
          [namespace]: {
            ...selections[namespace],
            [serverUrl]: toolNames,
          },
        });
      }
    },
    [selections, setSelections],
  );

  return { getToolSelections, saveToolSelections };
};
