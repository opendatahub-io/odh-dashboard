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
  selectSystemInstruction,
  selectSelectedModel,
  selectSelectedMcpServerIds,
  selectConfigIds,
} from '~/app/Chatbot/store';

interface ViewCodeModalProps {
  isOpen: boolean;
  onToggle: () => void;
  configId: string;
  input: string;
  files: FileModel[];
  isRagEnabled?: boolean;
  mcpServers?: MCPServerFromAPI[];
  mcpServerTokens?: Map<string, TokenInfo>;
  namespace?: string;
}

// Stable default values to prevent unnecessary re-renders
const EMPTY_MCP_SERVERS: MCPServerFromAPI[] = [];
const EMPTY_TOKEN_MAP = new Map<string, TokenInfo>();

/**
 * Component to render a single code panel with title and code editor
 */
interface CodePanelProps {
  configId: string;
  code: string;
  isLoading: boolean;
  error: string;
}

const CodePanel: React.FC<CodePanelProps> = ({ configId, code, isLoading, error }) => {
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
        {configId}: {displayName}
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
  configId,
  input,
  files,
  isRagEnabled = false,
  mcpServers = EMPTY_MCP_SERVERS,
  mcpServerTokens = EMPTY_TOKEN_MAP,
  namespace,
}) => {
  // Get all config IDs to determine if in compare mode
  const configIds = useChatbotConfigStore(selectConfigIds);
  const isCompareMode = configIds.length > 1;

  // Get config values from Zustand for each config
  const model1 = useChatbotConfigStore(selectSelectedModel(configIds[0] || configId));
  const systemInstruction1 = useChatbotConfigStore(
    selectSystemInstruction(configIds[0] || configId),
  );
  const selectedMcpServerIds1 = useChatbotConfigStore(
    selectSelectedMcpServerIds(configIds[0] || configId),
  );

  const model2 = useChatbotConfigStore(selectSelectedModel(configIds[1] || ''));
  const systemInstruction2 = useChatbotConfigStore(selectSystemInstruction(configIds[1] || ''));
  const selectedMcpServerIds2 = useChatbotConfigStore(
    selectSelectedMcpServerIds(configIds[1] || ''),
  );

  // Get tool selections callback
  const toolSelections = React.useCallback(
    (cfgId: string, ns: string, url: string) =>
      useChatbotConfigStore.getState().getToolSelections(cfgId, ns, url),
    [],
  );

  const [code1, setCode1] = React.useState<string>('');
  const [code2, setCode2] = React.useState<string>('');
  const [isLoading1, setIsLoading1] = React.useState<boolean>(false);
  const [isLoading2, setIsLoading2] = React.useState<boolean>(false);
  const [error1, setError1] = React.useState<string>('');
  const [error2, setError2] = React.useState<string>('');

  const [vectorStores, vectorStoresLoaded] = useFetchVectorStores();
  const { api, apiAvailable } = useGenAiAPI();

  const mcpServersToUse1 = React.useMemo(
    () => mcpServers.filter((server) => selectedMcpServerIds1.includes(server.url)),
    [mcpServers, selectedMcpServerIds1],
  );

  const mcpServersToUse2 = React.useMemo(
    () => mcpServers.filter((server) => selectedMcpServerIds2.includes(server.url)),
    [mcpServers, selectedMcpServerIds2],
  );

  const exportCodeForConfig = React.useCallback(
    async (
      cfgId: string,
      model: string,
      systemInstruction: string,
      mcpServersToUse: MCPServerFromAPI[],
      setCode: React.Dispatch<React.SetStateAction<string>>,
      setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
      setError: React.Dispatch<React.SetStateAction<string>>,
    ) => {
      setIsLoading(true);
      setError('');
      setCode('');

      if (!apiAvailable) {
        setError('API is not available');
        setIsLoading(false);
        return;
      }

      if (!vectorStoresLoaded || vectorStores.length === 0) {
        setError('Vector stores not loaded');
        setIsLoading(false);
        return;
      }

      try {
        /* eslint-disable camelcase */
        const request: CodeExportRequest = {
          input,
          model,
          instructions: systemInstruction,
          stream: false,
          mcp_servers: mcpServersToUse.map((server) => {
            const config = generateMCPServerConfig(server, mcpServerTokens);
            if (namespace) {
              const savedTools = toolSelections(cfgId, namespace, server.url);
              if (savedTools !== undefined) {
                config.allowed_tools = savedTools;
              }
            }
            return config;
          }),
          vector_store: {
            name: vectorStores[0].name,
            provider_id: vectorStores[0].metadata.provider_id,
          },
          files: files.map((file) => ({ file: file.filename, purpose: file.purpose })),
          ...(files.length > 0 &&
            isRagEnabled && {
              tools: [{ type: 'file_search', vector_store_ids: [vectorStores[0].id] }],
            }),
        };
        /* eslint-enable camelcase */

        const response = await api.exportCode(request);
        setCode(response.code);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to export code');
      } finally {
        setIsLoading(false);
      }
    },
    [
      apiAvailable,
      vectorStoresLoaded,
      vectorStores,
      input,
      files,
      isRagEnabled,
      api,
      mcpServerTokens,
      namespace,
      toolSelections,
    ],
  );

  React.useEffect(() => {
    if (isOpen) {
      // Export code for first config
      exportCodeForConfig(
        configIds[0] || configId,
        model1,
        systemInstruction1,
        mcpServersToUse1,
        setCode1,
        setIsLoading1,
        setError1,
      );

      // Export code for second config if in compare mode
      if (isCompareMode && configIds[1]) {
        exportCodeForConfig(
          configIds[1],
          model2,
          systemInstruction2,
          mcpServersToUse2,
          setCode2,
          setIsLoading2,
          setError2,
        );
      }
    }
  }, [
    isOpen,
    exportCodeForConfig,
    configId,
    configIds,
    isCompareMode,
    model1,
    model2,
    systemInstruction1,
    systemInstruction2,
    mcpServersToUse1,
    mcpServersToUse2,
  ]);

  const modalTitle = isCompareMode ? 'View Code - Compare Mode' : 'Playground configuration';

  return (
    <Modal
      variant={isCompareMode ? ModalVariant.large : ModalVariant.large}
      isOpen={isOpen}
      onClose={onToggle}
      data-testid="view-code-modal"
      style={isCompareMode ? { width: '90%', maxWidth: '1400px' } : undefined}
    >
      <ModalHeader title={modalTitle} />
      <ModalBody>
        {isCompareMode ? (
          <div style={{ display: 'flex', gap: 'var(--pf-t--global--spacer--lg)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <CodePanel
                configId={configIds[0]}
                code={code1}
                isLoading={isLoading1}
                error={error1}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <CodePanel
                configId={configIds[1]}
                code={code2}
                isLoading={isLoading2}
                error={error2}
              />
            </div>
          </div>
        ) : (
          <>
            {error1 ? (
              <Alert variant={AlertVariant.danger} title="Error exporting code" isInline>
                {error1}
              </Alert>
            ) : isLoading1 ? (
              <Bullseye>
                <Spinner size="lg" />
              </Bullseye>
            ) : (
              <CodeEditor
                isCopyEnabled
                code={code1}
                isLanguageLabelVisible
                language={Language.python}
                height="400px"
                isReadOnly
              />
            )}
          </>
        )}
      </ModalBody>
    </Modal>
  );
};

export default ViewCodeModal;
