import React from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { ExplainabilityContextProvider } from '~/concepts/explainability/ExplainabilityContext';
import NotFound from '~/pages/NotFound';

const ModelServingExplainabilityWrapper: React.FC = () => {
  const { project: namespace } = useParams<{ project: string }>();

  if (!namespace) {
    return <NotFound />;
  }

  return (
    <ExplainabilityContextProvider namespace={namespace}>
      <Outlet />
    </ExplainabilityContextProvider>
  );
};

export default ModelServingExplainabilityWrapper;
