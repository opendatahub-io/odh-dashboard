import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
// TODO: Replace this import with the proper one in the dashboard main package.
import { NotFound } from '~/shared/components';
import { NavDataItem } from './standalone/types';
import useUser from './hooks/useUser';
import MainPage from './pages/MainPage';
import SettingsMainPage from './pages/SettingsMainPage';

export const useAdminSettings = (): NavDataItem[] => {
  const { clusterAdmin } = useUser();

  if (!clusterAdmin) {
    return [];
  }

  return [
    {
      label: 'Settings',
      children: [{ label: 'Main View Settings', path: '/main-view-settings' }],
    },
  ];
};

export const useNavData = (): NavDataItem[] => {
  const baseNavItems = [
    {
      label: 'Main View',
      path: '/main-view',
    },
  ];

  return [...baseNavItems, ...useAdminSettings()];
};

const AppRoutes: React.FC = () => {
  const { clusterAdmin } = useUser();

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/main-view" replace />} />
      <Route path="/main-view/*" element={<MainPage />} />
      <Route path="*" element={<NotFound />} />
      {/* TODO: [Conditional render] Follow up add testing and conditional rendering when in standalone mode */}
      {clusterAdmin && <Route path="/main-view-settings/*" element={<SettingsMainPage />} />}
    </Routes>
  );
};

export default AppRoutes;
