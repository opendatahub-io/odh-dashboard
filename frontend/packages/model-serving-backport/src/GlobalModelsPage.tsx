import React from 'react';
import ModelServingContextProvider from '@odh-dashboard/internal/pages/modelServing/ModelServingContext';
import ModelServingGlobal from '@odh-dashboard/internal/pages/modelServing/screens/global/ModelServingGlobal.js';
import { useParams } from 'react-router-dom';

const GlobalModelsPage: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  return (
    <ModelServingContextProvider namespace={namespace}>
      <ModelServingGlobal />
    </ModelServingContextProvider>
  );
};

export default GlobalModelsPage;
