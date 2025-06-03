import * as React from 'react';
import { Navigate, Route } from 'react-router-dom';
import ProjectsRoutes from '#~/concepts/projects/ProjectsRoutes';
import LMEvalForm from './lmEvalForm/LMEvalForm';
import LMEvalCoreLoader from './global/LMEvalCoreLoader';
import LMEval from './global/LMEval';

const LMEvalRoutes: React.FC = () => (
  <ProjectsRoutes>
    <Route
      path="/:namespace?/*"
      element={<LMEvalCoreLoader getInvalidRedirectPath={(namespace) => `/lmEval/${namespace}`} />}
    >
      <Route index element={<LMEval />} />
      <Route path="evaluate" element={<LMEvalForm />} />
      <Route path="*" element={<Navigate to="." />} />
    </Route>
  </ProjectsRoutes>
);

export default LMEvalRoutes;
