import * as React from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import { buildV2RedirectRoutes } from '#~/utilities/v2Redirect';
import CustomServingRuntimeView from './CustomServingRuntimeView';
import CustomServingRuntimeContextProvider from './CustomServingRuntimeContext';
import CustomServingRuntimeAddTemplate from './CustomServingRuntimeAddTemplate';
import CustomServingRuntimeEditTemplate from './CustomServingRuntimeEditTemplate';
import { v2RedirectMap } from './v2Redirects';

const CustomServingRuntimeRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<CustomServingRuntimeContextProvider />}>
      <Route index element={<CustomServingRuntimeView />} />
      <Route path="add" element={<CustomServingRuntimeAddTemplate />} />
      <Route path="edit/:servingRuntimeName" element={<CustomServingRuntimeEditTemplate />} />
      {buildV2RedirectRoutes(v2RedirectMap)}
      <Route path="*" element={<Navigate to="." />} />
    </Route>
  </Routes>
);

export default CustomServingRuntimeRoutes;
