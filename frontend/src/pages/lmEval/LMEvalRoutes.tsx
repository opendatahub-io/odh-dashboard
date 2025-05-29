import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import LMEvalForm from './LMEvalForm';

const LMEvalRoutes: React.FC = () => (
  <Routes>
    <Route path="/evaluate" element={<LMEvalForm />} />
    <Route path="*" element={<Navigate to="." />} />
  </Routes>
);

export default LMEvalRoutes;
