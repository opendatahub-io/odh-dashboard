import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { McpCatalogContextProvider } from '~/app/context/mcpCatalog/McpCatalogContext';
import OdhMcpCatalogCoreLoader from '~/odh/components/OdhMcpCatalogCoreLoader';
import McpCatalog from './screens/McpCatalog';
import McpServerDetailsPage from './screens/McpServerDetailsPage';

const McpCatalogRoutes: React.FC = () => (
  <McpCatalogContextProvider>
    <Routes>
      <Route path="/*" element={<OdhMcpCatalogCoreLoader />}>
        <Route index element={<McpCatalog />} />
        <Route path=":serverId" element={<McpServerDetailsPage />} />
        <Route path="*" element={<Navigate to="." />} />
      </Route>
    </Routes>
  </McpCatalogContextProvider>
);

export default McpCatalogRoutes;
