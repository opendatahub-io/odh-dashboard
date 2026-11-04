import React from 'react';
import { Navigate } from 'react-router-dom';
import { PORTAL_MODELS_PATH } from './portalPaths';

const RootRedirect: React.FC = () => <Navigate to={PORTAL_MODELS_PATH} replace />;

export default RootRedirect;
