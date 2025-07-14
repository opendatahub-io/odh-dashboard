import React from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { TrustyAIContextProvider } from '#~/concepts/trustyai/context/TrustyAIContext';
import NotFound from '#~/pages/NotFound';

const ModelServingExplainabilityWrapper: React.FC = () => {
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

export default ModelServingExplainabilityWrapper;
