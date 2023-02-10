import * as React from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import ModelServingContextProvider from './ModelServingContext';
import ModelServingMetricsWrapper from './screens/metrics/ModelServingMetricsWrapper';
import ModelServingGlobal from './screens/global/ModelServingGlobal';

const ModelServingRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<ModelServingContextProvider />}>
        <Route index element={<ModelServingGlobal />} />
        <Route
          path="/metrics/:project/:inferenceService"
          element={<ModelServingMetricsWrapper />}
        />
        <Route path="*" element={<Navigate to="." />} />
      </Route>
    </Routes>
  );
};

export default ModelServingRoutes;
