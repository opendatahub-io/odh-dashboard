import * as React from 'react';
import { Modal, ModalHeader, ModalBody, Title, Spinner, Alert } from '@patternfly/react-core';
import { Table } from 'mod-arch-shared';
import { useMCPServerTools } from '~/app/hooks/useMCPServerTools';
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
  const {
    tools: apiTools,
    toolsLoaded,
    toolsLoadError,
    toolsStatus,
    isLoading,
  } = useMCPServerTools(server.connectionUrl, mcpBearerToken, isOpen);

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
      <ModalBody>
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
                data={tools}
                columns={MCPToolsColumns}
                enablePagination="compact"
                rowRenderer={(tool: MCPTool) => <MCPToolsTableRow key={tool.id} tool={tool} />}
                data-testid="mcp-tools-modal-table"
              />
            )}
          </>
        )}
      </ModalBody>
    </Modal>
  );
};

export default MCPServerToolsModal;
