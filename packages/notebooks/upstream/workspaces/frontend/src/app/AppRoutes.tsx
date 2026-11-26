import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { AppRoutePaths } from '~/app/routes';
import { WorkspaceKindSummaryWrapper } from '~/app/pages/WorkspaceKinds/summary/WorkspaceKindSummaryWrapper';
import { WorkspaceForm } from '~/app/pages/Workspaces/Form/WorkspaceForm';
import { useAppContext } from '~/app/context/AppContext';
import { NotFound } from './pages/notFound/NotFound';
import { WorkspaceKinds } from './pages/WorkspaceKinds/WorkspaceKinds';
import { WorkspacesWrapper } from './pages/Workspaces/WorkspacesWrapper';
import { WorkspaceKindForm } from './pages/WorkspaceKinds/Form/WorkspaceKindForm';

export const isNavDataGroup = (navItem: NavDataItem): navItem is NavDataGroup =>
  'children' in navItem;

type NavDataCommon = {
  label: string;
};

export type NavDataHref = NavDataCommon & {
  path: string;
};

export type NavDataGroup = NavDataCommon & {
  children: NavDataHref[];
};

type NavDataItem = NavDataHref | NavDataGroup;

const useAdminNavItems = (): NavDataItem[] => {
  const { user } = useAppContext();

  if (!user?.clusterAdmin) {
    return [];
  }

  return [
    {
      label: 'Workspace kinds',
      path: AppRoutePaths.workspaceKinds,
    },
  ];
};

export const useNavData = (): NavDataItem[] => [
  {
    label: 'Workspaces',
    path: AppRoutePaths.workspaces,
  },
  ...useAdminNavItems(),
];

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path={AppRoutePaths.workspaceCreate} element={<WorkspaceForm />} />
    <Route path={AppRoutePaths.workspaceEdit} element={<WorkspaceForm />} />
    <Route path={AppRoutePaths.workspaces} element={<WorkspacesWrapper />} />
    <Route path={AppRoutePaths.workspaceKindSummary} element={<WorkspaceKindSummaryWrapper />} />
    <Route path={AppRoutePaths.workspaceKinds} element={<WorkspaceKinds />} />
    <Route path={AppRoutePaths.workspaceKindCreate} element={<WorkspaceKindForm />} />
    <Route path={AppRoutePaths.workspaceKindEdit} element={<WorkspaceKindForm />} />
    <Route path={AppRoutePaths.root} element={<Navigate to={AppRoutePaths.workspaces} replace />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;
