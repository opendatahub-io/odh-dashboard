import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import NotFound from './components/NotFound';
import { agentDeploymentsPath } from './utilities/routes';

const DeploymentsWrapper = React.lazy(() => import('../odh/openshell/DeploymentsWrapper'));

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<Navigate to={agentDeploymentsPath} replace />} />
    <Route
      path={`${agentDeploymentsPath}/*`}
      element={
        <React.Suspense fallback={null}>
          <DeploymentsWrapper />
        </React.Suspense>
      }
    />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;
