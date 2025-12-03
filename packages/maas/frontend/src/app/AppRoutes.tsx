import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import NotFound from '@odh-dashboard/internal/pages/NotFound';
import MainPage from './pages/MainPage';

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/main-view" replace />} />
    <Route path="/main-view/*" element={<MainPage />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;
