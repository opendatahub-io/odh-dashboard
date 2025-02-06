import * as React from 'react';
import { Navigate, Route } from 'react-router-dom';
import ProjectsRoutes from '~/concepts/projects/ProjectsRoutes';
import GlobalModelCustomization from '~/pages/pipelines/global/modelCustomization/GlobalModelCustomization';

const GlobalModelCustomizationRoutes: React.FC = () => (
  <ProjectsRoutes>
    <Route path="/" element={<GlobalModelCustomization />} />
    <Route path="*" element={<Navigate to="." />} />
  </ProjectsRoutes>
);
export default GlobalModelCustomizationRoutes;
