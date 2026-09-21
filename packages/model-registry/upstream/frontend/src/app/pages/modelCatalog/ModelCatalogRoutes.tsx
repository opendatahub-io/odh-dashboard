import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { generateExtensionTabRoutes, useExtensions } from '@odh-dashboard/plugin-core';
import { isDetailTabExtension } from '@odh-dashboard/plugin-core/extension-points';
import { ModelCatalogContextProvider } from '~/app/context/modelCatalog/ModelCatalogContext';
import { ModelDetailsTab } from '~/concepts/modelCatalog/const';
import OdhModelCatalogCoreLoader from '~/odh/components/OdhModelCatalogCoreLoader';
import OdhModelDetailsPage from '~/odh/components/OdhModelDetailsPage';
import { MODEL_CATALOG_DETAILS_GROUP } from './screens/ModelDetailsTabs';
import RegisterCatalogModelPage from './screens/RegisterCatalogModelPage';
import ModelCatalog from './screens/ModelCatalog';

const ModelCatalogRoutes: React.FC = () => {
  const allTabExtensions = useExtensions(isDetailTabExtension);

  return (
    <ModelCatalogContextProvider>
      <Routes>
        <Route path="/:sourceId?/*" element={<OdhModelCatalogCoreLoader />}>
          <Route index element={<ModelCatalog />} />
          <Route path=":modelName">
            <Route index element={<Navigate to={ModelDetailsTab.OVERVIEW} replace />} />
            <Route
              path={ModelDetailsTab.OVERVIEW}
              element={<OdhModelDetailsPage tab={ModelDetailsTab.OVERVIEW} />}
            />
            <Route
              path={ModelDetailsTab.PERFORMANCE_INSIGHTS}
              element={<OdhModelDetailsPage tab={ModelDetailsTab.PERFORMANCE_INSIGHTS} />}
            />
            {generateExtensionTabRoutes({
              tabExtensions: allTabExtensions,
              group: MODEL_CATALOG_DETAILS_GROUP,
              renderElement: (tabId) => <OdhModelDetailsPage tab={tabId} />,
            })}
            <Route path="register" element={<RegisterCatalogModelPage />} />
            <Route path="*" element={<Navigate to="." />} />
          </Route>
          <Route path="*" element={<Navigate to="." />} />
        </Route>
      </Routes>
    </ModelCatalogContextProvider>
  );
};

export default ModelCatalogRoutes;
