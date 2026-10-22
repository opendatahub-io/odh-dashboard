import React from 'react';
import { Navigate } from 'react-router-dom';
import { useFeatureFlag } from '@openshift/dynamic-plugin-sdk';
import { GRID } from './featureFlags';
import { PORTAL_MODELS_PATH, PORTAL_ROOT_REDIRECT_PATH } from './portalPaths';

const RootRedirect: React.FC = () => {
  const [gridEnabled] = useFeatureFlag(GRID);

  return <Navigate to={gridEnabled ? PORTAL_MODELS_PATH : PORTAL_ROOT_REDIRECT_PATH} replace />;
};

export default RootRedirect;
