import { Outlet, useParams } from 'react-router-dom';
import React from 'react';
import NotFound from '~/pages/NotFound';
import { ExplainabilityContextProvider } from '~/concepts/explainability/ExplainabilityContext';

const ProjectInferenceExplainabilityWrapper: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();

  if (!namespace) {
    return <NotFound />;
  }

  return (
    <ExplainabilityContextProvider namespace={namespace}>
      <Outlet />
    </ExplainabilityContextProvider>
  );
};

export default ProjectInferenceExplainabilityWrapper;
