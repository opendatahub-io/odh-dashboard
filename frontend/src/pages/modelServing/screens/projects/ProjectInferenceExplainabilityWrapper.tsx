import { Outlet, useParams } from 'react-router-dom';
import React from 'react';
import NotFound from '#~/pages/NotFound';
import { TrustyAIContextProvider } from '#~/concepts/trustyai/context/TrustyAIContext';

const ProjectInferenceExplainabilityWrapper: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();

  if (!namespace) {
    return <NotFound />;
  }

  return (
    <TrustyAIContextProvider namespace={namespace}>
      <Outlet />
    </TrustyAIContextProvider>
  );
};

export default ProjectInferenceExplainabilityWrapper;
