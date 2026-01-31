import React from 'react';

/**
 * This is the tab that shows up in the AI Assets page for the MaaS models.
 * It is a simple wrapper, because gen-ai actually owns the MaaS tab content. But we want to keep the actual maas extension point where it belongs (the maas package)
 *The actual content is rendered by the gen-ai package, in the AIAssetsPage component, via the `children` prop.
 */
const GenAiMaaSTabWrapper: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <>{children}</>
);

export default GenAiMaaSTabWrapper;
