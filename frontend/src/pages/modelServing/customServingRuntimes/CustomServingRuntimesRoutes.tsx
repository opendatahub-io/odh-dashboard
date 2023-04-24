import * as React from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import CustomServingRuntimesView from './CustomServingRuntimesView';
import CustomServingRuntimeContextProvider from './CustomServingRuntimeContext';
import CustomServingRuntimeAddTemplate from './CustomServingRuntimeAddTemplate';

const CustomServingRuntimesRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<CustomServingRuntimeContextProvider />}>
      <Route index element={<CustomServingRuntimesView />} />
      <Route path="addServingRuntime" element={<CustomServingRuntimeAddTemplate />} />
      <Route path="*" element={<Navigate to="." />} />
    </Route>
  </Routes>
);

export default CustomServingRuntimesRoutes;
