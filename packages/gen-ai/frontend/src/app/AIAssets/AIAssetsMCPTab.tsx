import * as React from 'react';
import { EmptyState, Spinner } from '@patternfly/react-core';
import { GenAiContext } from '~/app/context/GenAiContext';
import { useMCPServers } from '~/app/hooks/useMCPServers';
import MCPServersTable from './components/mcp/MCPServersTable';

const AIAssetsMCPTab: React.FC = () => {
  const { namespace } = React.useContext(GenAiContext);
  const { servers, serversLoaded, serversLoadError, serverStatuses, statusesLoading, refresh } =
    useMCPServers(namespace?.name || '');

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

export default AIAssetsMCPTab;
