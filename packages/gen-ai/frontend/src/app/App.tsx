import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '~/app/standalone/AppLayout';
import { AppRoutes } from '~/app/AppRoutes';
import { chatPlaygroundRootPath } from '~/app/utilities/routes';
import '@patternfly/react-core/dist/styles/base.css';
import './app.css';

const App: React.FunctionComponent = () => (
  <AppLayout>
    <Routes>
      <Route path="/gen-ai/*" element={<AppRoutes />} />
      <Route path="*" element={<Navigate to={chatPlaygroundRootPath} replace />} />
    </Routes>
  </AppLayout>
);

export default App;
