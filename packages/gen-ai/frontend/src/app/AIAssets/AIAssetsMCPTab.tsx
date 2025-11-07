import * as React from 'react';
import { EmptyState, Spinner } from '@patternfly/react-core';
import { GenAiContext } from '~/app/context/GenAiContext';
import { MCPDataProvider } from '~/app/context/MCPContextProvider';
import { useMCPServers } from '~/app/hooks/useMCPServers';
import MCPServersTable from '~/app/AIAssets/components/mcp/MCPServersTable';

const MCPTabContent: React.FC = () => {
  const { servers, serversLoaded, serversLoadError, serverStatuses, statusesLoading, refresh } =
    useMCPServers();

  if (!serversLoaded) {
    return <EmptyState titleText="Loading" headingLevel="h4" icon={Spinner} />;
  }

  return (
    <MCPServersTable
      servers={servers}
      error={serversLoadError}
      serverStatuses={serverStatuses}
      statusesLoading={statusesLoading}
      onRefresh={refresh}
    />
  );
};

/**
 * MCP tab component with complete context provider.
 * Provides MCP data context and loads data only when the tab is accessed.
 */
const AIAssetsMCPTab: React.FC = () => {
  const { namespace } = React.useContext(GenAiContext);

  return (
    <MCPDataProvider namespace={namespace} autoCheckStatuses>
      <MCPTabContent />
    </MCPDataProvider>
  );
};

export default AIAssetsMCPTab;
