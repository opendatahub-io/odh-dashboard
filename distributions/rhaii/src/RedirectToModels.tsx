import React from 'react';
import { Navigate } from 'react-router-dom';

const RedirectToModels: React.FC = () => <Navigate to="/ai-hub/models" replace />;

export default RedirectToModels;
