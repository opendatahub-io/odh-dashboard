import * as React from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import ModelServingContextProvider from './ModelServingContext';
import ModelServingMetricsWrapper from './screens/metrics/ModelServingMetricsWrapper';
import ModelServingGlobal from './screens/global/ModelServingGlobal';
import { isModelMetricsEnabled } from './screens/metrics/utils';
import { useDashboardNamespace } from 'redux/selectors';
import { useAppContext } from 'app/AppContext';

const ModelServingRoutes: React.FC = () => {
  const { dashboardNamespace } = useDashboardNamespace();
  const { dashboardConfig } = useAppContext();

  return (
    <Routes>
      <Route path="/" element={<ModelServingContextProvider />}>
        <Route index element={<ModelServingGlobal />} />
        <Route
          path="/metrics/:project/:inferenceService"
          element={
            isModelMetricsEnabled(dashboardNamespace, dashboardConfig) ? (
              <ModelServingMetricsWrapper />
            ) : (
              <Navigate replace to="/" />
            )
          }
        />
        <Route path="*" element={<Navigate to="." />} />
      </Route>
    </Routes>
  );
};

export default ModelServingRoutes;
