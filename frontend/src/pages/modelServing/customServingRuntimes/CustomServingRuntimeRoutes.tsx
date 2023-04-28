import * as React from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import CustomServingRuntimeView from './CustomServingRuntimeView';
import CustomServingRuntimeContextProvider from './CustomServingRuntimeContext';
import CustomServingRuntimeAddTemplate from './CustomServingRuntimeAddTemplate';
import CustomServingRuntimeEditTemplate from './CustomServingRuntimeEditTemplate';

const CustomServingRuntimeRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<CustomServingRuntimeContextProvider />}>
      <Route index element={<CustomServingRuntimeView />} />
      <Route path="addServingRuntime" element={<CustomServingRuntimeAddTemplate />} />
      <Route
        path="editServingRuntime/:servingRuntimeName"
        element={<CustomServingRuntimeEditTemplate />}
      />
      <Route path="*" element={<Navigate to="." />} />
    </Route>
  </Routes>
);

export default CustomServingRuntimeRoutes;
