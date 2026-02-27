import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import NotFound from '@odh-dashboard/internal/pages/NotFound';
import { NavDataItem } from '~/app/standalone/types';
import MainPage from './pages/MainPage';

export const useNavData = (): NavDataItem[] => [
  {
    label: 'Main View',
    path: '/main-view/*',
    href: '/main-view',
  },
];

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/main-view" replace />} />
    <Route path="/main-view/*" element={<MainPage />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;
