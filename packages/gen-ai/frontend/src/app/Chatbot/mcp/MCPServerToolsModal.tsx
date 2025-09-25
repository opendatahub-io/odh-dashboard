import * as React from 'react';
import {
  Modal,
  ModalHeader,
  ModalBody,
  Title,
  Spinner,
  Alert,
  Button,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { SyncAltIcon } from '@patternfly/react-icons';
import { Table } from 'mod-arch-shared';
import { useMCPServerTools } from '~/app/hooks/useMCPServerTools';
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
  const selectedProject = namespace?.name;

  const {
    tools: apiTools,
    toolsLoaded,
    toolsLoadError,
    toolsStatus,
    isLoading,
    refetch,
  } = useMCPServerTools(selectedProject || '', server.connectionUrl, mcpBearerToken, isOpen);

  const tools = React.useMemo(
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

  const handleRetry = React.useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="large"
      aria-labelledby="mcp-tools-modal-title"
    >
      <ModalHeader>
        <Title headingLevel="h2" size="xl" id="mcp-tools-modal-title">
          {server.name} - Tools
        </Title>
      </ModalHeader>
      <ModalBody>
        {isLoading && !toolsLoaded && (
          <div className="pf-v6-u-text-align-center pf-v6-u-p-xl" role="status" aria-live="polite">
            <Spinner size="lg" aria-label="Loading tools" />
            <div className="pf-v6-u-mt-md">Loading tools from {server.name}...</div>
          </div>
        )}

        {toolsLoadError && (
          <Alert
            variant="danger"
            title={`Failed to load tools from ${server.name}`}
            actionLinks={
              <button
                type="button"
                onClick={handleRetry}
                className="pf-v6-c-button pf-m-link"
                aria-label={`Retry loading tools from ${server.name}`}
              >
                Try again
              </button>
            }
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
              <>
                <Table
                  data={tools}
                  columns={MCPToolsColumns}
                  enablePagination="compact"
                  rowRenderer={(tool: MCPTool) => <MCPToolsTableRow key={tool.id} tool={tool} />}
                  toolbarContent={
                    <Toolbar>
                      <ToolbarContent>
                        <ToolbarItem>
                          <div className="pf-v6-u-align-self-center pf-v6-u-font-weight-bold">
                            Available tools on the {server.name}
                          </div>
                          <Button variant="link" onClick={handleRetry} icon={<SyncAltIcon />}>
                            Retry
                          </Button>
                        </ToolbarItem>
                      </ToolbarContent>
                    </Toolbar>
                  }
                  data-testid="mcp-tools-modal-table"
                />
              </>
            )}
          </>
        )}
      </ModalBody>
    </Modal>
  );
};

export default MCPServerToolsModal;
