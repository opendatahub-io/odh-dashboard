import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import NotFound from './components/NotFound';
import ConnectionTypeDetails from './pages/ConnectionTypeDetails';
import ConnectionDetails from './pages/ConnectionDetails';
import MainPage from './pages/MainPage';

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<Navigate to="connection-types" replace />} />
    <Route path="/connection-types" element={<MainPage activeTabKey="connection-types" />} />
    <Route path="/connections" element={<MainPage activeTabKey="connections" />} />
    <Route path="/connection-types/:connectionTypeId" element={<ConnectionTypeDetails />} />
    <Route path="/connections/:connectionId" element={<ConnectionDetails />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;
