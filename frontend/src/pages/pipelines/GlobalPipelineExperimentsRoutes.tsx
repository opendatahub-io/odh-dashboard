import * as React from 'react';
import { Navigate, Route, useParams } from 'react-router-dom';
import ProjectsRoutes from '@odh-dashboard/ui-core/components/ProjectsRoutes';
import { pipelineRunsBaseRoute } from '#~/routes/pipelines/runs';

const GlobalPipelineExperimentsRedirect: React.FC = () => {
  const { namespace } = useParams();
  return <Navigate to={pipelineRunsBaseRoute(namespace)} replace />;
};

const GlobalPipelineExperimentsRoutes: React.FC = () => (
  <ProjectsRoutes>
    <Route path="/:namespace?/*" element={<GlobalPipelineExperimentsRedirect />} />
  </ProjectsRoutes>
);

export default GlobalPipelineExperimentsRoutes;
