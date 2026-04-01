import * as React from 'react';
import {
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  Spinner,
  Alert,
  AlertVariant,
  Bullseye,
  Title,
} from '@patternfly/react-core';
import { CodeEditor, Language } from '@patternfly/react-code-editor';
import { CodeExportRequest, FileModel, MCPServerFromAPI, TokenInfo } from '~/app/types';
import { generateMCPServerConfig, getLlamaModelDisplayName } from '~/app/utilities';
import useFetchVectorStores from '~/app/hooks/useFetchVectorStores';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import {
  useChatbotConfigStore,
  selectSelectedModel,
  selectConfigIds,
  getConfigDisplayLabel,
} from '~/app/Chatbot/store';
import { usePlaygroundStore } from '~/app/Chatbot/store/usePlaygroundStore';

interface ViewCodeModalProps {
  isOpen: boolean;
  onToggle: () => void;
  input: string;
  files: FileModel[];
  mcpServers?: MCPServerFromAPI[];
  mcpServerTokens?: Map<string, TokenInfo>;
  namespace?: string;
}

// Stable default values to prevent unnecessary re-renders
const EMPTY_MCP_SERVERS: MCPServerFromAPI[] = [];
const EMPTY_TOKEN_MAP = new Map<string, TokenInfo>();

/**
 * State for each config's code export
 */
interface ConfigCodeState {
  code: string;
  isLoading: boolean;
  error: string;
}

/**
 * Component to render a single code panel with title and code editor
 */
interface CodePanelProps {
  configId: string;
  /** Display label like "Model 1", "Model 2" */
  displayLabel: string;
  code: string;
  isLoading: boolean;
  error: string;
}

const CodePanel: React.FC<CodePanelProps> = ({
  configId,
  displayLabel,
  code,
  isLoading,
  error,
}) => {
  const { aiModels } = React.useContext(ChatbotContext);
  const model = useChatbotConfigStore(selectSelectedModel(configId));
  const displayName = getLlamaModelDisplayName(model, aiModels) || model;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        flex: 1,
      }}
    >
      {/* Panel header with model name */}
      <Title
        headingLevel="h3"
        size="md"
        style={{ marginBottom: 'var(--pf-t--global--spacer--md)' }}
      >
        {displayLabel}: {displayName}
      </Title>

      {/* Code content */}
      {error ? (
        <Alert variant={AlertVariant.danger} title="Error exporting code" isInline>
          {error}
        </Alert>
      ) : isLoading ? (
        <Bullseye style={{ flex: 1 }}>
          <Spinner size="lg" />
        </Bullseye>
      ) : (
        <CodeEditor
          isCopyEnabled
          code={code}
          isLanguageLabelVisible
          language={Language.python}
          height="400px"
          isReadOnly
        />
      )}
    </div>
  );
};

const ViewCodeModal: React.FunctionComponent<ViewCodeModalProps> = ({
  isOpen,
  onToggle,
  input,
  files,
  mcpServers = EMPTY_MCP_SERVERS,
  mcpServerTokens = EMPTY_TOKEN_MAP,
  namespace,
}) => {
  // Get all config IDs from store
  const configIds = useChatbotConfigStore(selectConfigIds);
  const isCompareMode = configIds.length > 1;
  const activePrompt = usePlaygroundStore((state) => state.activePrompt);

  // Dynamic state for each config's code export
  const [codeStates, setCodeStates] = React.useState<Record<string, ConfigCodeState | undefined>>(
    {},
  );

  const [vectorStores, vectorStoresLoaded] = useFetchVectorStores();
  const { api, apiAvailable } = useGenAiAPI();

  // Get tool selections callback
  const toolSelections = React.useCallback(
    (cfgId: string, ns: string, url: string) =>
      useChatbotConfigStore.getState().getToolSelections(cfgId, ns, url),
    [],
  );

  const exportCodeForConfig = React.useCallback(
    async (cfgId: string) => {
      // Get config values directly from store
      const state = useChatbotConfigStore.getState();
      const config = state.getConfiguration(cfgId);
      if (!config) {
        return;
      }

      const {
        selectedModel,
        systemInstruction,
        selectedMcpServerIds,
        isRagEnabled,
        knowledgeMode,
        selectedVectorStoreId,
      } = config;
      const mcpServersToUse = mcpServers.filter((server) =>
        selectedMcpServerIds.includes(server.url),
      );

      // Set loading state
      setCodeStates((prev) => ({
        ...prev,
        [cfgId]: { code: '', isLoading: true, error: '' },
      }));

      if (!apiAvailable) {
        setCodeStates((prev) => ({
          ...prev,
          [cfgId]: { code: '', isLoading: false, error: 'API is not available' },
        }));
        return;
      }

      if (isRagEnabled && !selectedVectorStoreId) {
        setCodeStates((prev) => ({
          ...prev,
          [cfgId]: { code: '', isLoading: false, error: 'No vector store selected' },
        }));
        return;
      }

      if (isRagEnabled && !vectorStoresLoaded) {
        setCodeStates((prev) => ({
          ...prev,
          [cfgId]: { code: '', isLoading: false, error: 'Vector stores not loaded' },
        }));
        return;
      }

      const selectedVectorStore = isRagEnabled
        ? vectorStores.find((vs) => vs.id === selectedVectorStoreId)
        : undefined;

      if (isRagEnabled && !selectedVectorStore) {
        setCodeStates((prev) => ({
          ...prev,
          [cfgId]: { code: '', isLoading: false, error: 'Selected vector store not available' },
        }));
        return;
      }

      try {
        /* eslint-disable camelcase */
        const request: CodeExportRequest = {
          input,
          model: selectedModel,
          instructions: systemInstruction,
          stream: false,
          mcp_servers: mcpServersToUse.map((server) => {
            const serverConfig = generateMCPServerConfig(server, mcpServerTokens);
            if (namespace) {
              const savedTools = toolSelections(cfgId, namespace, server.url);
              if (savedTools !== undefined) {
                serverConfig.allowed_tools = savedTools;
              }
            }
            return serverConfig;
          }),
          // Both modes: reference the vector store
          ...(isRagEnabled &&
            selectedVectorStore && {
              vector_store: {
                name: selectedVectorStore.name,
                provider_id: selectedVectorStore.metadata.provider_id,
                // External mode: pass ID (and embedding model if known) so the template
                // references the existing store rather than creating a new one
                ...(knowledgeMode === 'external' && {
                  id: selectedVectorStore.id,
                  ...(selectedVectorStore.metadata.embedding_model && {
                    embedding_model: selectedVectorStore.metadata.embedding_model,
                  }),
                }),
              },
              // Always pass the file_search tool so vector_store_ids reaches responses.create
              tools: [{ type: 'file_search', vector_store_ids: [selectedVectorStore.id] }],
              // Inline mode: also upload files to the vector store
              ...(knowledgeMode === 'inline' &&
                files.length > 0 && {
                  files: files.map((file) => ({ file: file.filename, purpose: file.purpose })),
                }),
            }),
          ...(activePrompt && {
            prompt: { name: activePrompt.name, version: activePrompt.version },
          }),
        };
        /* eslint-enable camelcase */

        const response = await api.exportCode(request);
        setCodeStates((prev) => ({
          ...prev,
          [cfgId]: { code: response.code, isLoading: false, error: '' },
        }));
      } catch (err) {
        setCodeStates((prev) => ({
          ...prev,
          [cfgId]: {
            code: '',
            isLoading: false,
            error: err instanceof Error ? err.message : 'Failed to export code',
          },
        }));
      }
    },
    [
      apiAvailable,
      vectorStoresLoaded,
      vectorStores,
      input,
      files,
      api,
      mcpServers,
      mcpServerTokens,
      namespace,
      toolSelections,
      activePrompt,
    ],
  );

  // Export code for all configs when modal opens
  React.useEffect(() => {
    if (isOpen) {
      configIds.forEach((cfgId) => {
        exportCodeForConfig(cfgId);
      });
    }
  }, [isOpen, configIds, exportCodeForConfig]);

  const modalTitle = isCompareMode ? 'View Code - Compare Mode' : 'Playground configuration';

  // Get state for a config, with defaults
  const getConfigState = (cfgId: string): ConfigCodeState => {
    const state = codeStates[cfgId];
    if (state) {
      return state;
    }
    return { code: '', isLoading: true, error: '' };
  };

  return (
    <Modal
      variant={ModalVariant.large}
      isOpen={isOpen}
      onClose={onToggle}
      data-testid="view-code-modal"
      style={isCompareMode ? { width: '90%', maxWidth: '1400px' } : undefined}
    >
      <ModalHeader title={modalTitle} />
      <ModalBody>
        {isCompareMode ? (
          <div style={{ display: 'flex', gap: 'var(--pf-t--global--spacer--lg)' }}>
            {configIds.map((cfgId, index) => {
              const state = getConfigState(cfgId);
              return (
                <div key={cfgId} style={{ flex: 1, minWidth: 0 }}>
                  <CodePanel
                    configId={cfgId}
                    displayLabel={getConfigDisplayLabel(index)}
                    code={state.code}
                    isLoading={state.isLoading}
                    error={state.error}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          (() => {
            const state = getConfigState(configIds[0]);
            return state.error ? (
              <Alert variant={AlertVariant.danger} title="Error exporting code" isInline>
                {state.error}
              </Alert>
            ) : state.isLoading ? (
              <Bullseye>
                <Spinner size="lg" />
              </Bullseye>
            ) : (
              <CodeEditor
                isCopyEnabled
                code={state.code}
                isLanguageLabelVisible
                language={Language.python}
                height="400px"
                isReadOnly
              />
            );
          })()
        )}
      </ModalBody>
    </Modal>
  );
};

export default ViewCodeModal;
