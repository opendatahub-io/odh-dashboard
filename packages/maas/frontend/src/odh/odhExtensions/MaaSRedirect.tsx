import React from 'react';
import { Navigate } from 'react-router-dom';

const MaaSRedirect: React.FC = () => <Navigate to="/maas/tokens" replace />;

export default MaaSRedirect;
