import * as React from 'react';
import { Navigate, Route } from 'react-router-dom';
import ProjectsRoutes from '@odh-dashboard/internal/concepts/projects/ProjectsRoutes';
import ModelTraining from './global/ModelTraining';
import ModelTrainingCoreLoader from './global/ModelTrainingCoreLoader';

const TrainingJobDetails = React.lazy(
  () => import('./global/trainingJobDetails/TrainingJobDetails'),
);

const ModelTrainingRoutes: React.FC = () => (
  <ProjectsRoutes>
    <Route
      path="/:namespace?/*"
      element={
        <ModelTrainingCoreLoader
          getInvalidRedirectPath={(namespace) => `/modelTraining/${namespace}`}
        />
      }
    >
      <Route index element={<ModelTraining />} />
      <Route path=":jobName" element={<TrainingJobDetails />} />
      <Route path="*" element={<Navigate to="." />} />
    </Route>
  </ProjectsRoutes>
);

export default ModelTrainingRoutes;
