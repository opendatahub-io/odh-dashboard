import * as React from 'react';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Title,
  Spinner,
  Alert,
  SearchInput,
  ToolbarItem,
  Content,
  Flex,
  Button,
} from '@patternfly/react-core';
import { Table, useCheckboxTableBase } from 'mod-arch-shared';
import { useMCPServerTools } from '~/app/hooks/useMCPServerTools';
import { useMCPToolSelections } from '~/app/hooks/useMCPToolSelections';
import { GenAiContext } from '~/app/context/GenAiContext';
import { MCPServer, MCPTool } from '~/app/types';
import MCPToolsColumns from './MCPToolsColumns';
import MCPToolsTableRow from './MCPToolsTableRow';

interface MCPServerToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  server: MCPServer;
  mcpBearerToken?: string;
}

const MCPServerToolsModal: React.FC<MCPServerToolsModalProps> = ({
  isOpen,
  onClose,
  server,
  mcpBearerToken,
}) => {
  const { namespace } = React.useContext(GenAiContext);
  const { getToolSelections, saveToolSelections } = useMCPToolSelections();

  const {
    tools: apiTools,
    toolsLoaded,
    toolsLoadError,
    toolsStatus,
    isLoading,
  } = useMCPServerTools(server.connectionUrl, mcpBearerToken, isOpen);

  const [searchValue, setSearchValue] = React.useState('');

  const tools: MCPTool[] = React.useMemo(
    () =>
      apiTools.map((apiTool, index) => ({
        id: `${server.id}-tool-${index}`,
        name: apiTool.name,
        description: apiTool.description,
        permissions: [],
        enabled: true,
      })),
    [apiTools, server.id],
  );

  const filteredTools = React.useMemo(
    () => tools.filter((tool) => tool.name.toLowerCase().includes(searchValue.toLowerCase())),
    [tools, searchValue],
  );

  const namespaceName = namespace?.name;

  const initialSelectedTools = React.useMemo(() => {
    if (!namespaceName || !toolsLoaded || tools.length === 0) {
      return null;
    }

    const savedTools = getToolSelections(namespaceName, server.connectionUrl);

    // If undefined (never saved), select all tools by default
    if (savedTools === undefined) {
      return tools;
    }

    const savedToolObjects = savedTools
      .map((toolName) => tools.find((t) => t.name === toolName))
      .filter((tool): tool is MCPTool => tool !== undefined);

    return savedToolObjects;
  }, [namespaceName, server.connectionUrl, toolsLoaded, getToolSelections, tools]);

  const [selectedTools, setSelectedTools] = React.useState<MCPTool[]>([]);

  const { selections, tableProps, isSelected, toggleSelection } = useCheckboxTableBase<MCPTool>(
    filteredTools,
    selectedTools,
    setSelectedTools,
    React.useCallback((tool: MCPTool) => tool.id, []),
    { persistSelections: true },
  );

  const hasInitialized = React.useRef(false);

  React.useEffect(() => {
    if (isOpen && toolsLoaded && initialSelectedTools !== null && !hasInitialized.current) {
      setSelectedTools(initialSelectedTools);
      hasInitialized.current = true;
    } else if (!isOpen && hasInitialized.current) {
      hasInitialized.current = false;
    }
  }, [isOpen, toolsLoaded, initialSelectedTools]);

  const handleSave = React.useCallback(() => {
    if (!namespaceName) {
      onClose();
      return;
    }

    const selectedToolNames = selections.map((tool) => tool.name);
    const isAllToolsSelected = selectedToolNames.length === tools.length;

    saveToolSelections(
      namespaceName,
      server.connectionUrl,
      isAllToolsSelected ? undefined : selectedToolNames,
    );

    onClose();
  }, [namespaceName, selections, tools.length, saveToolSelections, server.connectionUrl, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="large"
      aria-labelledby="mcp-tools-modal-title"
      data-testid="mcp-tools-modal"
    >
      <ModalHeader>
        <Title headingLevel="h2" size="xl" id="mcp-tools-modal-title">
          {server.name}
        </Title>
      </ModalHeader>
      <ModalBody className="pf-v6-u-pt-md">
        {isLoading && !toolsLoaded && (
          <div className="pf-v6-u-text-align-center pf-v6-u-p-xl" role="status" aria-live="polite">
            <Spinner size="lg" aria-label="Loading tools" />
          </div>
        )}

        {toolsLoadError && (
          <Alert
            variant="danger"
            title={`Failed to load tools from ${server.name}`}
            className="pf-v6-u-mb-md"
          >
            {toolsLoadError.message}
            {toolsStatus?.error_details?.code && (
              <div className="pf-v6-u-mt-sm pf-v6-u-font-size-sm pf-v6-u-color-200">
                Error code: {toolsStatus.error_details.code}
              </div>
            )}
          </Alert>
        )}

        {toolsLoaded && !isLoading && !toolsLoadError && (
          <>
            {tools.length === 0 ? (
              <div className="pf-v6-u-text-align-center pf-v6-u-p-xl pf-v6-u-color-200">
                {toolsStatus?.status === 'success'
                  ? 'No tools available for this server'
                  : 'Unable to retrieve tools - please check server configuration'}
              </div>
            ) : (
              <Table
                {...tableProps}
                variant="compact"
                data={filteredTools}
                columns={MCPToolsColumns}
                enablePagination="compact"
                rowRenderer={(tool: MCPTool) => (
                  <MCPToolsTableRow
                    key={tool.id}
                    tool={tool}
                    isChecked={isSelected(tool)}
                    onToggleCheck={() => toggleSelection(tool)}
                  />
                )}
                toolbarContent={
                  <Flex alignItems={{ default: 'alignItemsCenter' }}>
                    <ToolbarItem style={{ minWidth: '463px' }}>
                      <SearchInput
                        aria-label="Find by name"
                        placeholder="Find by name"
                        value={searchValue}
                        onChange={(_event, value) => setSearchValue(value)}
                        onClear={() => setSearchValue('')}
                      />
                    </ToolbarItem>
                    <ToolbarItem>
                      <Content data-testid="mcp-tools-selection-count">
                        {selections.length} out of {tools.length} selected
                      </Content>
                    </ToolbarItem>
                  </Flex>
                }
                data-testid="mcp-tools-modal-table"
              />
            )}
          </>
        )}
      </ModalBody>
      {toolsLoaded && !isLoading && !toolsLoadError && tools.length > 0 && (
        <ModalFooter>
          <Button key="save" variant="primary" onClick={handleSave}>
            Save
          </Button>
          <Button key="cancel" variant="link" onClick={onClose}>
            Cancel
          </Button>
        </ModalFooter>
      )}
    </Modal>
  );
};

export default MCPServerToolsModal;
