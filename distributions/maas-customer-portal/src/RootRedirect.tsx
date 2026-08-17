import React from 'react';
import { Navigate } from 'react-router-dom';

const RootRedirect: React.FC = () => <Navigate to="/maas/keys-and-subs" replace />;

export default RootRedirect;
