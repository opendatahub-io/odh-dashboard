import * as React from 'react';
import { GenAiContext } from '~/app/context/GenAiContext';
import { MCPFullProvider } from '~/app/context/MCPContextProvider';
import AIAssetsMCPTab from './AIAssetsMCPTab';

/**
 * Wrapper component that provides full MCP context for the AI Assets MCP tab.
 * This ensures the heavy MCP contexts are only loaded when the MCP tab is accessed.
 */
const AIAssetsMCPTabWithContext: React.FC = () => {
  const { namespace } = React.useContext(GenAiContext);

  return (
    <MCPFullProvider namespace={namespace} autoCheckStatuses>
      <AIAssetsMCPTab />
    </MCPFullProvider>
  );
};

export default AIAssetsMCPTabWithContext;
