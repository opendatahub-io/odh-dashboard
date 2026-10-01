import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import NotFound from './components/NotFound';
import MainPage from './pages/MainPage';

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/ai-hub/data/browse" replace />} />
    <Route path="/ai-hub/data/browse/*" element={<MainPage />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;
