import * as React from 'react';
import { Outlet } from 'react-router';
import { conditionalArea, SupportedArea } from '#~/concepts/areas';
import { ModelCatalogContextProvider } from '#~/concepts/modelCatalog/context/ModelCatalogContext';

const ModelCatalogCoreLoader: React.FC = conditionalArea(
  SupportedArea.MODEL_CATALOG,
  true,
)(() => (
  <ModelCatalogContextProvider>
    <Outlet />
  </ModelCatalogContextProvider>
));

export default ModelCatalogCoreLoader;
