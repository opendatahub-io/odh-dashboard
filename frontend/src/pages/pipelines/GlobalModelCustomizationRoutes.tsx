import * as React from 'react';
import { Navigate, Route } from 'react-router-dom';
import ProjectsRoutes from '~/concepts/projects/ProjectsRoutes';
import GlobalModelCustomization from '~/pages/pipelines/global/modelCustomization/GlobalModelCustomization';
import { getInvalidRedirectPath } from '~/routes/pipelines/modelCustomizationForm';
import ModelCustomizationForm from './global/modelCustomization/ModelCustomizationForm';
import GlobalPipelineCoreLoader from './global/GlobalPipelineCoreLoader';

const GlobalModelCustomizationRoutes: React.FC = () => (
  <ProjectsRoutes>
    <Route path="/" element={<GlobalModelCustomization />} />
    <Route
      path="instructlab/:namespace?/*"
      element={<GlobalPipelineCoreLoader strict getInvalidRedirectPath={getInvalidRedirectPath} />}
    >
      <Route index element={<ModelCustomizationForm />} />
      <Route path="*" element={<Navigate to="." />} />
    </Route>
    <Route path="*" element={<Navigate to="." />} />
  </ProjectsRoutes>
);
export default GlobalModelCustomizationRoutes;
