import * as React from 'react';
import { Navigate, Route } from 'react-router-dom';
import ProjectsRoutes from '#~/concepts/projects/ProjectsRoutes';
import { getModelCustomizationPath } from '#~/routes/pipelines/modelCustomization';
import ModelCustomization from '#~/pages/pipelines/global/modelCustomization/landingPage/ModelCustomization';
import ModelCustomizationForm from './global/modelCustomization/ModelCustomizationForm';
import GlobalPipelineCoreLoader from './global/GlobalPipelineCoreLoader';

const GlobalModelCustomizationRoutes: React.FC = () => (
  <ProjectsRoutes>
    <Route path="/" element={<ModelCustomization />} />
    <Route
      path="fine-tune/:namespace?"
      element={
        <GlobalPipelineCoreLoader strict getInvalidRedirectPath={getModelCustomizationPath} />
      }
    >
      <Route index element={<ModelCustomizationForm />} />
      <Route path="*" element={<Navigate to="." />} />
    </Route>
    <Route path="*" element={<Navigate to="." />} />
  </ProjectsRoutes>
);
export default GlobalModelCustomizationRoutes;
