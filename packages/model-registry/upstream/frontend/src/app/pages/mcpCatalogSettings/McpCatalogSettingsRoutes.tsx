import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { McpCatalogSettingsContextProvider } from '~/app/context/mcpCatalogSettings/McpCatalogSettingsContext';
import McpCatalogSettings from '~/app/pages/mcpCatalogSettings/screens/McpCatalogSettings';
import McpManageSourcePage from '~/app/pages/mcpCatalogSettings/screens/McpManageSourcePage';

const McpCatalogSettingsRoutes: React.FC = () => (
  <McpCatalogSettingsContextProvider>
    <Routes>
      <Route path="/" element={<McpCatalogSettings />} />
      <Route path="add-source" element={<McpManageSourcePage />} />
      <Route path="manage-source/:catalogSourceId" element={<McpManageSourcePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </McpCatalogSettingsContextProvider>
);

export default McpCatalogSettingsRoutes;
