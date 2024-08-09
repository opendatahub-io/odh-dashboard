import * as React from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import { CreateConnectionTypePage } from './CreateConnectionType/CreateConnectionTypePage';
import { DuplicateConnectionTypePage } from './CreateConnectionType/DuplicateConnectionTypePage';
import { EditConnectionTypePage } from './CreateConnectionType/EditConnectionTypePage';

const ConnectionTypeRoutes: React.FC = () => (
  <Routes>
    <Route path="/">
      <Route path="create" element={<CreateConnectionTypePage />} />
      <Route path="duplicate/:name" element={<DuplicateConnectionTypePage />} />
      <Route path="edit/:name" element={<EditConnectionTypePage />} />
      <Route path="*" element={<Navigate to="." />} />
    </Route>
  </Routes>
);

export default ConnectionTypeRoutes;
