import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { AppRoutePaths } from '~/app/routes';
import { WorkspaceKindSummaryWrapper } from '~/app/pages/WorkspaceKinds/summary/WorkspaceKindSummaryWrapper';
import { WorkspaceForm } from '~/app/pages/Workspaces/Form/WorkspaceForm';
import { Debug } from './pages/Debug/Debug';
import { NotFound } from './pages/notFound/NotFound';
import { WorkspaceKinds } from './pages/WorkspaceKinds/WorkspaceKinds';
import { WorkspacesWrapper } from './pages/Workspaces/WorkspacesWrapper';
import { WorkspaceKindForm } from './pages/WorkspaceKinds/Form/WorkspaceKindForm';
import '~/shared/style/MUI-theme.scss';

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

export const useAdminDebugSettings = (): NavDataItem[] => {
  // get auth access for example set admin as true
  const isAdmin = true; //this should be a call to getting auth / role access

  // TODO: Remove the linter skip when we implement authentication
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!isAdmin) {
    return [];
  }

  return [
    {
      label: 'Debug',
      children: [{ label: 'Notebooks', path: '/notebookDebugSettings' }],
    },
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
  ...useAdminDebugSettings(),
];

const AppRoutes: React.FC = () => {
  const isAdmin = true;

  return (
    <Routes>
      <Route path={AppRoutePaths.workspaceCreate} element={<WorkspaceForm />} />
      <Route path={AppRoutePaths.workspaceEdit} element={<WorkspaceForm />} />
      <Route path={AppRoutePaths.workspaces} element={<WorkspacesWrapper />} />
      <Route path={AppRoutePaths.workspaceKindSummary} element={<WorkspaceKindSummaryWrapper />} />
      <Route path={AppRoutePaths.workspaceKinds} element={<WorkspaceKinds />} />
      <Route path={AppRoutePaths.workspaceKindCreate} element={<WorkspaceKindForm />} />
      <Route path={AppRoutePaths.workspaceKindEdit} element={<WorkspaceKindForm />} />
      <Route path="/" element={<Navigate to={AppRoutePaths.workspaces} replace />} />
      <Route path="*" element={<NotFound />} />
      {
        // TODO: Remove the linter skip when we implement authentication
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        isAdmin && <Route path="/notebookDebugSettings/*" element={<Debug />} />
      }
    </Routes>
  );
};

export default AppRoutes;
