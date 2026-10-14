import React from 'react';
import { Navigate } from 'react-router-dom';
import { PORTAL_ROOT_REDIRECT_PATH } from './portalPaths';

const RootRedirect: React.FC = () => <Navigate to={PORTAL_ROOT_REDIRECT_PATH} replace />;

export default RootRedirect;
