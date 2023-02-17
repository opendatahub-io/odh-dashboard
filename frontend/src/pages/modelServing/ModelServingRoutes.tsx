import * as React from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import ModelServingContextProvider from './ModelServingContext';
import ModelServingMetricsWrapper from './screens/metrics/ModelServingMetricsWrapper';
import ModelServingGlobal from './screens/global/ModelServingGlobal';
import useModelMetricsEnabled from './useModelMetricsEnabled';

const ModelServingRoutes: React.FC = () => {
  const [modelMetricsEnabled] = useModelMetricsEnabled();

  return (
    <Routes>
      <Route path="/" element={<ModelServingContextProvider />}>
        <Route index element={<ModelServingGlobal />} />
        <Route
          path="/metrics/:project/:inferenceService"
          element={
            modelMetricsEnabled ? <ModelServingMetricsWrapper /> : <Navigate replace to="/" />
          }
        />
        <Route path="*" element={<Navigate to="." />} />
      </Route>
    </Routes>
  );
};

export default ModelServingRoutes;
