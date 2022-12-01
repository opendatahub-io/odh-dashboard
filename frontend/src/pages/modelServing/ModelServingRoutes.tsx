import * as React from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import ModelServingContextProvider from './ModelServingContext';
import ModelServingGlobal from './screens/global/ModelServingGlobal';
import ModelServingMetrics from './screens/metrics/ModelServingMetrics';

const ModelServingRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<ModelServingContextProvider />}>
        <Route index element={<ModelServingGlobal />} />
        <Route
          path="/metrics/:servingruntime/:inferenceservice"
          element={<ModelServingMetrics />}
        />
        <Route path="*" element={<Navigate to="." />} />
      </Route>
    </Routes>
  );
};

export default ModelServingRoutes;
