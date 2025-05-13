import React from 'react';
import ModelsProjectDetailsView from './components/projectDetails/ModelsProjectDetailsView';
import { ModelServingProvider } from './concepts/ModelServingContext';

const ModelsProjectDetailsTab: React.FC = () => (
  <ModelServingProvider>
    <ModelsProjectDetailsView />
  </ModelServingProvider>
);

export default ModelsProjectDetailsTab;
