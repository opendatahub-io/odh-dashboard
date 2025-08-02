import * as React from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { ModelTrainingContextProvider } from './ModelTrainingContext';

type ModelTrainingCoreLoaderProps = {
  getInvalidRedirectPath: (namespace: string) => string;
};

const ModelTrainingCoreLoader: React.FC<ModelTrainingCoreLoaderProps> = ({
  getInvalidRedirectPath,
}) => {
  const { namespace } = useParams<{ namespace: string }>();

  // For now, simplified - can add validation logic later like LMEvalCoreLoader
  return (
    <ModelTrainingContextProvider namespace={namespace}>
      <Outlet />
    </ModelTrainingContextProvider>
  );
};

export default ModelTrainingCoreLoader;
