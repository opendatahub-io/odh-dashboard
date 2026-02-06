import { act } from '@testing-library/react';
import { useChatbotConfigStore } from '~/app/Chatbot/store/useChatbotConfigStore';
import { DEFAULT_CONFIGURATION } from '~/app/Chatbot/store/types';

describe('useChatbotConfigStore', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    // Reset store to initial state
    act(() => {
      useChatbotConfigStore.setState({
        configurations: { default: { ...DEFAULT_CONFIGURATION } },
      });
    });
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      const state = useChatbotConfigStore.getState();

      expect(state.configurations.default).toEqual(DEFAULT_CONFIGURATION);
    });
  });

  describe('field-specific updaters', () => {
    it('should update systemInstruction', () => {
      act(() => {
        useChatbotConfigStore.getState().updateSystemInstruction('default', 'New instruction');
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations.default?.systemInstruction).toBe('New instruction');
    });

    it('should update temperature', () => {
      act(() => {
        useChatbotConfigStore.getState().updateTemperature('default', 0.7);
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations.default?.temperature).toBe(0.7);
    });

    it('should update isStreamingEnabled', () => {
      act(() => {
        useChatbotConfigStore.getState().updateStreamingEnabled('default', false);
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations.default?.isStreamingEnabled).toBe(false);
    });

    it('should update selectedMcpServerIds', () => {
      const serverIds = ['server-1', 'server-2', 'server-3'];

      act(() => {
        useChatbotConfigStore.getState().updateSelectedMcpServerIds('default', serverIds);
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations.default?.selectedMcpServerIds).toEqual(serverIds);
    });

    it('should update selectedMcpServerIds to empty array', () => {
      // First set some server IDs
      act(() => {
        useChatbotConfigStore.getState().updateSelectedMcpServerIds('default', ['server-1']);
      });

      // Then clear them
      act(() => {
        useChatbotConfigStore.getState().updateSelectedMcpServerIds('default', []);
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations.default?.selectedMcpServerIds).toEqual([]);
    });

    it('should not update non-existent config', () => {
      act(() => {
        useChatbotConfigStore.getState().updateSystemInstruction('non-existent', 'New instruction');
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations['non-existent']).toBeUndefined();
    });

    it('should update currentVectorStoreId', () => {
      const vectorStoreId = 'test-vector-store-1';

      act(() => {
        useChatbotConfigStore.getState().updateCurrentVectorStoreId('default', vectorStoreId);
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations.default?.currentVectorStoreId).toBe(vectorStoreId);
    });
  });

  describe('resetConfiguration', () => {
    it('should reset to default configuration without parameters', () => {
      // Modify some fields first
      act(() => {
        useChatbotConfigStore.getState().updateSystemInstruction('default', 'Custom instruction');
        useChatbotConfigStore.getState().updateTemperature('default', 0.8);
        useChatbotConfigStore.getState().updateSelectedMcpServerIds('default', ['server-1']);
      });

      // Reset
      act(() => {
        useChatbotConfigStore.getState().resetConfiguration();
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations.default).toEqual(DEFAULT_CONFIGURATION);
    });

    it('should reset with initial selectedMcpServerIds', () => {
      const initialServerIds = ['server-1', 'server-2'];

      act(() => {
        useChatbotConfigStore.getState().resetConfiguration({
          selectedMcpServerIds: initialServerIds,
        });
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations.default?.selectedMcpServerIds).toEqual(initialServerIds);
      // Other fields should still be default
      expect(state.configurations.default?.systemInstruction).toBe(
        DEFAULT_CONFIGURATION.systemInstruction,
      );
      expect(state.configurations.default?.temperature).toBe(DEFAULT_CONFIGURATION.temperature);
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
      expect(state.configurations.default?.selectedMcpServerIds).toEqual(['server-1']);
      expect(state.configurations.default?.selectedModel).toBe('llama-3');
      expect(state.configurations.default?.temperature).toBe(0.5);
      // Other fields should still be default
      expect(state.configurations.default?.systemInstruction).toBe(
        DEFAULT_CONFIGURATION.systemInstruction,
      );
      expect(state.configurations.default?.isStreamingEnabled).toBe(
        DEFAULT_CONFIGURATION.isStreamingEnabled,
      );
    });

    it('should reset with empty initial values object', () => {
      // Modify some fields first
      act(() => {
        useChatbotConfigStore.getState().updateSystemInstruction('default', 'Custom instruction');
        useChatbotConfigStore.getState().updateSelectedMcpServerIds('default', ['server-1']);
      });

      // Reset with empty object
      act(() => {
        useChatbotConfigStore.getState().resetConfiguration({});
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations.default).toEqual(DEFAULT_CONFIGURATION);
    });
  });

  describe('MCP tool selections', () => {
    const configId = 'default';

    beforeEach(() => {
      // Clear sessionStorage before each test
      sessionStorage.clear();
    });

    it('should initialize with empty tool selections', () => {
      const state = useChatbotConfigStore.getState();
      expect(state.configurations.default?.mcpToolSelections).toEqual({});
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
            default: {
              ...DEFAULT_CONFIGURATION,
              mcpToolSelections: loadMcpToolSelectionsForConfig(configId),
            },
          },
          configIds: ['default'],
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
      const config = useChatbotConfigStore.getState().getConfiguration('default');

      expect(config).toEqual(DEFAULT_CONFIGURATION);
    });

    it('should return undefined for non-existent ID', () => {
      const config = useChatbotConfigStore.getState().getConfiguration('non-existent');

      expect(config).toBeUndefined();
    });
  });
});
