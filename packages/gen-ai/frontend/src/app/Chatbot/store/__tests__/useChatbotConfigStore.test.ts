import { act } from '@testing-library/react';
import { useChatbotConfigStore } from '~/app/Chatbot/store/useChatbotConfigStore';
import { DEFAULT_CONFIGURATION } from '~/app/Chatbot/store/types';
import { DEFAULT_CONFIG_ID } from '~/app/Chatbot/store';

describe('useChatbotConfigStore', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    // Reset store to initial state
    act(() => {
      useChatbotConfigStore.setState({
        configurations: { [DEFAULT_CONFIG_ID]: { ...DEFAULT_CONFIGURATION } },
        configIds: [DEFAULT_CONFIG_ID],
      });
    });
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      const state = useChatbotConfigStore.getState();

      expect(state.configurations[DEFAULT_CONFIG_ID]).toEqual(DEFAULT_CONFIGURATION);
    });
  });

  describe('field-specific updaters', () => {
    it('should update systemInstruction', () => {
      act(() => {
        useChatbotConfigStore
          .getState()
          .updateSystemInstruction(DEFAULT_CONFIG_ID, 'New instruction');
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations[DEFAULT_CONFIG_ID]?.systemInstruction).toBe('New instruction');
    });

    it('should update temperature', () => {
      act(() => {
        useChatbotConfigStore.getState().updateTemperature(DEFAULT_CONFIG_ID, 0.7);
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations[DEFAULT_CONFIG_ID]?.temperature).toBe(0.7);
    });

    it('should update isStreamingEnabled', () => {
      act(() => {
        useChatbotConfigStore.getState().updateStreamingEnabled(DEFAULT_CONFIG_ID, false);
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations[DEFAULT_CONFIG_ID]?.isStreamingEnabled).toBe(false);
    });

    it('should update selectedMcpServerIds', () => {
      const serverIds = ['server-1', 'server-2', 'server-3'];

      act(() => {
        useChatbotConfigStore.getState().updateSelectedMcpServerIds(DEFAULT_CONFIG_ID, serverIds);
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations[DEFAULT_CONFIG_ID]?.selectedMcpServerIds).toEqual(serverIds);
    });

    it('should update selectedMcpServerIds to empty array', () => {
      // First set some server IDs
      act(() => {
        useChatbotConfigStore
          .getState()
          .updateSelectedMcpServerIds(DEFAULT_CONFIG_ID, ['server-1']);
      });

      // Then clear them
      act(() => {
        useChatbotConfigStore.getState().updateSelectedMcpServerIds(DEFAULT_CONFIG_ID, []);
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations[DEFAULT_CONFIG_ID]?.selectedMcpServerIds).toEqual([]);
    });

    it('should not update non-existent config', () => {
      act(() => {
        useChatbotConfigStore.getState().updateSystemInstruction('non-existent', 'New instruction');
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations['non-existent']).toBeUndefined();
    });
  });

  describe('resetConfiguration', () => {
    it('should reset to default configuration without parameters', () => {
      // Modify some fields first
      act(() => {
        useChatbotConfigStore
          .getState()
          .updateSystemInstruction(DEFAULT_CONFIG_ID, 'Custom instruction');
        useChatbotConfigStore.getState().updateTemperature(DEFAULT_CONFIG_ID, 0.8);
        useChatbotConfigStore
          .getState()
          .updateSelectedMcpServerIds(DEFAULT_CONFIG_ID, ['server-1']);
      });

      // Reset
      act(() => {
        useChatbotConfigStore.getState().resetConfiguration();
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations[DEFAULT_CONFIG_ID]).toEqual(DEFAULT_CONFIGURATION);
    });

    it('should reset with initial selectedMcpServerIds', () => {
      const initialServerIds = ['server-1', 'server-2'];

      act(() => {
        useChatbotConfigStore.getState().resetConfiguration({
          selectedMcpServerIds: initialServerIds,
        });
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations[DEFAULT_CONFIG_ID]?.selectedMcpServerIds).toEqual(
        initialServerIds,
      );
      // Other fields should still be default
      expect(state.configurations[DEFAULT_CONFIG_ID]?.systemInstruction).toBe(
        DEFAULT_CONFIGURATION.systemInstruction,
      );
      expect(state.configurations[DEFAULT_CONFIG_ID]?.temperature).toBe(
        DEFAULT_CONFIGURATION.temperature,
      );
    });

    it('should reset with multiple initial values', () => {
      act(() => {
        useChatbotConfigStore.getState().resetConfiguration({
          selectedMcpServerIds: ['server-1'],
          selectedModel: 'llama-3',
          temperature: 0.5,
        });
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations[DEFAULT_CONFIG_ID]?.selectedMcpServerIds).toEqual(['server-1']);
      expect(state.configurations[DEFAULT_CONFIG_ID]?.selectedModel).toBe('llama-3');
      expect(state.configurations[DEFAULT_CONFIG_ID]?.temperature).toBe(0.5);
      // Other fields should still be default
      expect(state.configurations[DEFAULT_CONFIG_ID]?.systemInstruction).toBe(
        DEFAULT_CONFIGURATION.systemInstruction,
      );
      expect(state.configurations[DEFAULT_CONFIG_ID]?.isStreamingEnabled).toBe(
        DEFAULT_CONFIGURATION.isStreamingEnabled,
      );
    });

    it('should reset with empty initial values object', () => {
      // Modify some fields first
      act(() => {
        useChatbotConfigStore
          .getState()
          .updateSystemInstruction(DEFAULT_CONFIG_ID, 'Custom instruction');
        useChatbotConfigStore
          .getState()
          .updateSelectedMcpServerIds(DEFAULT_CONFIG_ID, ['server-1']);
      });

      // Reset with empty object
      act(() => {
        useChatbotConfigStore.getState().resetConfiguration({});
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations[DEFAULT_CONFIG_ID]).toEqual(DEFAULT_CONFIGURATION);
    });
  });

  describe('MCP tool selections', () => {
    const configId = DEFAULT_CONFIG_ID;

    beforeEach(() => {
      // Clear sessionStorage before each test
      sessionStorage.clear();
    });

    it('should initialize with empty tool selections', () => {
      const state = useChatbotConfigStore.getState();
      expect(state.configurations[DEFAULT_CONFIG_ID]?.mcpToolSelections).toEqual({});
    });

    it('should save tool selections for a namespace and server', () => {
      const namespace = 'test-namespace';
      const serverUrl = 'http://test-server';
      const toolNames = ['tool1', 'tool2', 'tool3'];

      act(() => {
        useChatbotConfigStore
          .getState()
          .saveToolSelections(configId, namespace, serverUrl, toolNames);
      });

      const selections = useChatbotConfigStore
        .getState()
        .getToolSelections(configId, namespace, serverUrl);
      expect(selections).toEqual(toolNames);
    });

    it('should update existing tool selections', () => {
      const namespace = 'test-namespace';
      const serverUrl = 'http://test-server';

      act(() => {
        useChatbotConfigStore
          .getState()
          .saveToolSelections(configId, namespace, serverUrl, ['tool1']);
      });

      act(() => {
        useChatbotConfigStore
          .getState()
          .saveToolSelections(configId, namespace, serverUrl, ['tool1', 'tool2']);
      });

      const selections = useChatbotConfigStore
        .getState()
        .getToolSelections(configId, namespace, serverUrl);
      expect(selections).toEqual(['tool1', 'tool2']);
    });

    it('should remove tool selections when passing undefined', () => {
      const namespace = 'test-namespace';
      const serverUrl = 'http://test-server';

      act(() => {
        useChatbotConfigStore
          .getState()
          .saveToolSelections(configId, namespace, serverUrl, ['tool1', 'tool2']);
      });

      act(() => {
        useChatbotConfigStore
          .getState()
          .saveToolSelections(configId, namespace, serverUrl, undefined);
      });

      const selections = useChatbotConfigStore
        .getState()
        .getToolSelections(configId, namespace, serverUrl);
      expect(selections).toBeUndefined();
    });

    it('should handle multiple namespaces independently', () => {
      const namespace1 = 'namespace-1';
      const namespace2 = 'namespace-2';
      const serverUrl = 'http://test-server';

      act(() => {
        useChatbotConfigStore
          .getState()
          .saveToolSelections(configId, namespace1, serverUrl, ['tool1']);
        useChatbotConfigStore
          .getState()
          .saveToolSelections(configId, namespace2, serverUrl, ['tool2']);
      });

      const selections1 = useChatbotConfigStore
        .getState()
        .getToolSelections(configId, namespace1, serverUrl);
      const selections2 = useChatbotConfigStore
        .getState()
        .getToolSelections(configId, namespace2, serverUrl);

      expect(selections1).toEqual(['tool1']);
      expect(selections2).toEqual(['tool2']);
    });

    it('should handle multiple servers in same namespace', () => {
      const namespace = 'test-namespace';
      const server1 = 'http://server-1';
      const server2 = 'http://server-2';

      act(() => {
        useChatbotConfigStore
          .getState()
          .saveToolSelections(configId, namespace, server1, ['tool1']);
        useChatbotConfigStore
          .getState()
          .saveToolSelections(configId, namespace, server2, ['tool2']);
      });

      const selections1 = useChatbotConfigStore
        .getState()
        .getToolSelections(configId, namespace, server1);
      const selections2 = useChatbotConfigStore
        .getState()
        .getToolSelections(configId, namespace, server2);

      expect(selections1).toEqual(['tool1']);
      expect(selections2).toEqual(['tool2']);
    });

    it('should return undefined for non-existent selections', () => {
      const selections = useChatbotConfigStore
        .getState()
        .getToolSelections(configId, 'non-existent', 'http://test-server');
      expect(selections).toBeUndefined();
    });

    it('should persist tool selections to sessionStorage with namespace → configId → serverUrl structure', () => {
      const namespace = 'test-namespace';
      const serverUrl = 'http://test-server';
      const toolNames = ['tool1', 'tool2'];

      act(() => {
        useChatbotConfigStore
          .getState()
          .saveToolSelections(configId, namespace, serverUrl, toolNames);
      });

      const stored = sessionStorage.getItem('mcp-tool-selections');
      expect(stored).toBeDefined();

      const parsed = JSON.parse(stored!);
      expect(parsed[namespace][configId][serverUrl]).toEqual(toolNames);
    });

    it('should load tool selections from sessionStorage on init', () => {
      const namespace = 'test-namespace';
      const serverUrl = 'http://test-server';
      const toolNames = ['tool1', 'tool2'];

      // Manually set sessionStorage with namespace → configId → serverUrl structure
      sessionStorage.setItem(
        'mcp-tool-selections',
        JSON.stringify({
          [namespace]: {
            [configId]: {
              [serverUrl]: toolNames,
            },
          },
        }),
      );

      // Reset store to trigger initialization
      const loadMcpToolSelectionsForConfig = (cId: string) => {
        const storage = JSON.parse(sessionStorage.getItem('mcp-tool-selections') || '{}') as Record<
          string,
          Record<string, Record<string, string[]> | undefined> | undefined
        >;
        const result: Record<string, Record<string, string[]>> = {};
        Object.entries(storage).forEach(([ns, configMap]) => {
          if (configMap?.[cId]) {
            result[ns] = configMap[cId];
          }
        });
        return result;
      };

      act(() => {
        useChatbotConfigStore.setState({
          configurations: {
            [DEFAULT_CONFIG_ID]: {
              ...DEFAULT_CONFIGURATION,
              mcpToolSelections: loadMcpToolSelectionsForConfig(configId),
            },
          },
          configIds: [DEFAULT_CONFIG_ID],
        });
      });

      const selections = useChatbotConfigStore
        .getState()
        .getToolSelections(configId, namespace, serverUrl);
      expect(selections).toEqual(toolNames);
    });

    it('should preserve tool selections when resetting configuration', () => {
      const namespace = 'test-namespace';
      const serverUrl = 'http://test-server';
      const toolNames = ['tool1', 'tool2'];

      act(() => {
        useChatbotConfigStore
          .getState()
          .saveToolSelections(configId, namespace, serverUrl, toolNames);
      });

      act(() => {
        useChatbotConfigStore.getState().resetConfiguration();
      });

      const selections = useChatbotConfigStore
        .getState()
        .getToolSelections(configId, namespace, serverUrl);
      expect(selections).toEqual(toolNames);
    });

    it('should handle multiple configs with independent tool selections', () => {
      const config1 = 'config-1';
      const config2 = 'config-2';
      const namespace = 'test-namespace';
      const serverUrl = 'http://test-server';

      // Create config1
      act(() => {
        useChatbotConfigStore.setState({
          configurations: {
            [config1]: { ...DEFAULT_CONFIGURATION },
          },
          configIds: [config1],
        });
      });

      act(() => {
        useChatbotConfigStore
          .getState()
          .saveToolSelections(config1, namespace, serverUrl, ['tool1']);
      });

      // Create config2
      act(() => {
        useChatbotConfigStore.setState({
          configurations: {
            [config1]: useChatbotConfigStore.getState().configurations[config1]!,
            [config2]: { ...DEFAULT_CONFIGURATION },
          },
          configIds: [config1, config2],
        });
      });

      act(() => {
        useChatbotConfigStore
          .getState()
          .saveToolSelections(config2, namespace, serverUrl, ['tool2']);
      });

      const selections1 = useChatbotConfigStore
        .getState()
        .getToolSelections(config1, namespace, serverUrl);
      const selections2 = useChatbotConfigStore
        .getState()
        .getToolSelections(config2, namespace, serverUrl);

      expect(selections1).toEqual(['tool1']);
      expect(selections2).toEqual(['tool2']);

      // Verify both are persisted with namespace → configId → serverUrl structure
      const stored = sessionStorage.getItem('mcp-tool-selections');
      const parsed = JSON.parse(stored!);
      expect(parsed[namespace][config1][serverUrl]).toEqual(['tool1']);
      expect(parsed[namespace][config2][serverUrl]).toEqual(['tool2']);
    });
  });

  describe('getConfiguration', () => {
    it('should return configuration by ID', () => {
      const config = useChatbotConfigStore.getState().getConfiguration(DEFAULT_CONFIG_ID);

      expect(config).toEqual(DEFAULT_CONFIGURATION);
    });

    it('should return undefined for non-existent ID', () => {
      const config = useChatbotConfigStore.getState().getConfiguration('non-existent');

      expect(config).toBeUndefined();
    });
  });

  describe('compare mode - duplicateConfiguration', () => {
    it('should create a new configuration with a unique ID', () => {
      act(() => {
        useChatbotConfigStore.getState().duplicateConfiguration(DEFAULT_CONFIG_ID);
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configIds).toHaveLength(2);
      expect(state.configIds[0]).toBe(DEFAULT_CONFIG_ID);
      expect(state.configIds[1]).toMatch(/^config-\d+$/);
    });

    it('should copy all settings from source configuration', () => {
      // Set up source config with specific values
      act(() => {
        const store = useChatbotConfigStore.getState();
        store.updateSelectedModel(DEFAULT_CONFIG_ID, 'test-model');
        store.updateTemperature(DEFAULT_CONFIG_ID, 1.5);
        store.updateStreamingEnabled(DEFAULT_CONFIG_ID, false);
        store.updateRagEnabled(DEFAULT_CONFIG_ID, true);
      });

      act(() => {
        useChatbotConfigStore.getState().duplicateConfiguration(DEFAULT_CONFIG_ID);
      });

      const state = useChatbotConfigStore.getState();
      const newConfigId = state.configIds[1];
      const newConfig = state.configurations[newConfigId];

      expect(newConfig?.selectedModel).toBe('test-model');
      expect(newConfig?.temperature).toBe(1.5);
      expect(newConfig?.isStreamingEnabled).toBe(false);
      expect(newConfig?.isRagEnabled).toBe(true);
    });

    it('should create deep copy of MCP server IDs array', () => {
      act(() => {
        useChatbotConfigStore
          .getState()
          .updateSelectedMcpServerIds(DEFAULT_CONFIG_ID, ['server-1', 'server-2']);
      });

      act(() => {
        useChatbotConfigStore.getState().duplicateConfiguration(DEFAULT_CONFIG_ID);
      });

      const state = useChatbotConfigStore.getState();
      const newConfigId = state.configIds[1];

      // Modify original array
      act(() => {
        useChatbotConfigStore
          .getState()
          .updateSelectedMcpServerIds(DEFAULT_CONFIG_ID, ['server-3']);
      });

      // New config should still have original values (deep copy)
      const newConfig = useChatbotConfigStore.getState().configurations[newConfigId];
      expect(newConfig?.selectedMcpServerIds).toEqual(['server-1', 'server-2']);
    });

    it('should not allow more than 2 configurations', () => {
      act(() => {
        useChatbotConfigStore.getState().duplicateConfiguration(DEFAULT_CONFIG_ID);
      });

      // Try to duplicate again
      act(() => {
        useChatbotConfigStore.getState().duplicateConfiguration(DEFAULT_CONFIG_ID);
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configIds).toHaveLength(2);
    });

    it('should not duplicate non-existent configuration', () => {
      act(() => {
        useChatbotConfigStore.getState().duplicateConfiguration('non-existent');
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configIds).toHaveLength(1);
    });

    it('should return the new configuration ID', () => {
      let newId: string | undefined;
      act(() => {
        newId = useChatbotConfigStore.getState().duplicateConfiguration(DEFAULT_CONFIG_ID);
      });

      expect(newId).toMatch(/^config-\d+$/);
      const state = useChatbotConfigStore.getState();
      expect(state.configIds).toContain(newId);
    });
  });

  describe('compare mode - removeConfiguration', () => {
    it('should remove the specified configuration', () => {
      let newConfigId: string | undefined;
      act(() => {
        newConfigId = useChatbotConfigStore.getState().duplicateConfiguration(DEFAULT_CONFIG_ID);
      });

      act(() => {
        useChatbotConfigStore.getState().removeConfiguration(newConfigId!);
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configIds).toEqual([DEFAULT_CONFIG_ID]);
      expect(state.configurations[newConfigId!]).toBeUndefined();
    });

    it('should not remove the last configuration', () => {
      act(() => {
        useChatbotConfigStore.getState().removeConfiguration(DEFAULT_CONFIG_ID);
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configIds).toEqual([DEFAULT_CONFIG_ID]);
      expect(state.configurations[DEFAULT_CONFIG_ID]).toBeDefined();
    });

    it('should not remove non-existent configuration', () => {
      act(() => {
        useChatbotConfigStore.getState().duplicateConfiguration(DEFAULT_CONFIG_ID);
      });

      act(() => {
        useChatbotConfigStore.getState().removeConfiguration('non-existent');
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configIds).toHaveLength(2);
    });

    it('should be able to remove either configuration when in compare mode', () => {
      let newConfigId: string | undefined;
      act(() => {
        newConfigId = useChatbotConfigStore.getState().duplicateConfiguration(DEFAULT_CONFIG_ID);
      });

      // Remove the original default config instead
      act(() => {
        useChatbotConfigStore.getState().removeConfiguration(DEFAULT_CONFIG_ID);
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configIds).toEqual([newConfigId]);
      expect(state.configurations[DEFAULT_CONFIG_ID]).toBeUndefined();
      expect(state.configurations[newConfigId!]).toBeDefined();
    });
  });

  describe('compare mode - per-config state isolation', () => {
    let config2Id: string | undefined;

    beforeEach(() => {
      act(() => {
        config2Id = useChatbotConfigStore.getState().duplicateConfiguration(DEFAULT_CONFIG_ID);
      });
    });

    it('should update selectedModel independently for each config', () => {
      act(() => {
        useChatbotConfigStore.getState().updateSelectedModel(DEFAULT_CONFIG_ID, 'model-1');
        useChatbotConfigStore.getState().updateSelectedModel(config2Id!, 'model-2');
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations[DEFAULT_CONFIG_ID]?.selectedModel).toBe('model-1');
      expect(state.configurations[config2Id!]?.selectedModel).toBe('model-2');
    });

    it('should update temperature independently for each config', () => {
      act(() => {
        useChatbotConfigStore.getState().updateTemperature(DEFAULT_CONFIG_ID, 0.5);
        useChatbotConfigStore.getState().updateTemperature(config2Id!, 1.8);
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations[DEFAULT_CONFIG_ID]?.temperature).toBe(0.5);
      expect(state.configurations[config2Id!]?.temperature).toBe(1.8);
    });

    it('should update streaming enabled independently for each config', () => {
      act(() => {
        useChatbotConfigStore.getState().updateStreamingEnabled(DEFAULT_CONFIG_ID, true);
        useChatbotConfigStore.getState().updateStreamingEnabled(config2Id!, false);
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations[DEFAULT_CONFIG_ID]?.isStreamingEnabled).toBe(true);
      expect(state.configurations[config2Id!]?.isStreamingEnabled).toBe(false);
    });

    it('should update RAG enabled independently for each config', () => {
      act(() => {
        useChatbotConfigStore.getState().updateRagEnabled(DEFAULT_CONFIG_ID, true);
        useChatbotConfigStore.getState().updateRagEnabled(config2Id!, false);
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations[DEFAULT_CONFIG_ID]?.isRagEnabled).toBe(true);
      expect(state.configurations[config2Id!]?.isRagEnabled).toBe(false);
    });

    it('should update system instruction independently for each config', () => {
      act(() => {
        useChatbotConfigStore
          .getState()
          .updateSystemInstruction(DEFAULT_CONFIG_ID, 'Instruction 1');
        useChatbotConfigStore.getState().updateSystemInstruction(config2Id!, 'Instruction 2');
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations[DEFAULT_CONFIG_ID]?.systemInstruction).toBe('Instruction 1');
      expect(state.configurations[config2Id!]?.systemInstruction).toBe('Instruction 2');
    });

    it('should update MCP server IDs independently for each config', () => {
      act(() => {
        useChatbotConfigStore
          .getState()
          .updateSelectedMcpServerIds(DEFAULT_CONFIG_ID, ['server-a']);
        useChatbotConfigStore.getState().updateSelectedMcpServerIds(config2Id!, ['server-b']);
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations[DEFAULT_CONFIG_ID]?.selectedMcpServerIds).toEqual(['server-a']);
      expect(state.configurations[config2Id!]?.selectedMcpServerIds).toEqual(['server-b']);
    });

    it('should update guardrail settings independently for each config', () => {
      act(() => {
        useChatbotConfigStore.getState().updateGuardrail(DEFAULT_CONFIG_ID, 'guardrail-1');
        useChatbotConfigStore.getState().updateGuardrail(config2Id!, 'guardrail-2');
        useChatbotConfigStore.getState().updateGuardrailUserInputEnabled(DEFAULT_CONFIG_ID, true);
        useChatbotConfigStore.getState().updateGuardrailUserInputEnabled(config2Id!, false);
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations[DEFAULT_CONFIG_ID]?.guardrail).toBe('guardrail-1');
      expect(state.configurations[config2Id!]?.guardrail).toBe('guardrail-2');
      expect(state.configurations[DEFAULT_CONFIG_ID]?.guardrailUserInputEnabled).toBe(true);
      expect(state.configurations[config2Id!]?.guardrailUserInputEnabled).toBe(false);
    });

    it('should maintain separate MCP tool selections for each config', () => {
      act(() => {
        useChatbotConfigStore
          .getState()
          .saveToolSelections(DEFAULT_CONFIG_ID, 'ns', 'http://server.com', ['tool-a']);
        useChatbotConfigStore
          .getState()
          .saveToolSelections(config2Id!, 'ns', 'http://server.com', ['tool-b']);
      });

      const selections1 = useChatbotConfigStore
        .getState()
        .getToolSelections(DEFAULT_CONFIG_ID, 'ns', 'http://server.com');
      const selections2 = useChatbotConfigStore
        .getState()
        .getToolSelections(config2Id!, 'ns', 'http://server.com');

      expect(selections1).toEqual(['tool-a']);
      expect(selections2).toEqual(['tool-b']);
    });
  });
});
