import React from 'react';
import { Navigate } from 'react-router-dom';

const RedirectToScaffold: React.FC = () => <Navigate to="/scaffold" replace />;

export default RedirectToScaffold;
