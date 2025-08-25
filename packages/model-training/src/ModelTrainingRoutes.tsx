import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ModelTraining from './ModelTraining';

const ModelTrainingRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<ModelTraining />} />
    <Route path="*" element={<Navigate to="." replace />} />
  </Routes>
);

export default ModelTrainingRoutes;
