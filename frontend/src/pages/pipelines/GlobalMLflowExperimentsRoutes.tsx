import * as React from 'react';
import { Navigate, Route } from 'react-router-dom';
import ProjectsRoutes from '#~/concepts/projects/ProjectsRoutes';
import GlobalMLflowExperimentsPage from '#~/pages/pipelines/global/mlflowExperiments/MLFlowExperimentsPage';

const GlobalMLflowExperimentsRoutes: React.FC = () => (
  <ProjectsRoutes>
    <Route index element={<GlobalMLflowExperimentsPage />} />
    <Route path="*" element={<Navigate to="." replace />} />
  </ProjectsRoutes>
);

export default GlobalMLflowExperimentsRoutes;
