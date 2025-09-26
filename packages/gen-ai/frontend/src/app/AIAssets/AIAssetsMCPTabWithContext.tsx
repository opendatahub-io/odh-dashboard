import * as React from 'react';
import { GenAiContext } from '~/app/context/GenAiContext';
import { MCPDataProvider } from '~/app/context/MCPContextProvider';
import AIAssetsMCPTab from './AIAssetsMCPTab';

/**
 * Wrapper component that provides complete MCP data context for the AI Assets MCP tab.
 * This ensures the MCP data contexts (servers and tokens) are only loaded when the MCP tab is accessed.
 */
const AIAssetsMCPTabWithContext: React.FC = () => {
  const { namespace } = React.useContext(GenAiContext);

  return (
    <MCPDataProvider namespace={namespace} autoCheckStatuses>
      <AIAssetsMCPTab />
    </MCPDataProvider>
  );
};

export default AIAssetsMCPTabWithContext;
