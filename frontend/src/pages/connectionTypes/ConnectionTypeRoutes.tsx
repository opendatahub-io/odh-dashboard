import * as React from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';

const ConnectionTypesPage = React.lazy(() => import('./ConnectionTypesPage'));
const CreateConnectionTypePage = React.lazy(() => import('./manage/CreateConnectionTypePage'));
const DuplicateConnectionTypePage = React.lazy(
  () => import('./manage/DuplicateConnectionTypePage'),
);
const EditConnectionTypePage = React.lazy(() => import('./manage/EditConnectionTypePage'));

const ConnectionTypeRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<ConnectionTypesPage />} />
    <Route path="create" element={<CreateConnectionTypePage />} />
    <Route path="duplicate/:name" element={<DuplicateConnectionTypePage />} />
    <Route path="edit/:name" element={<EditConnectionTypePage />} />
    <Route path="*" element={<Navigate to="/" />} />
  </Routes>
);

export default ConnectionTypeRoutes;
