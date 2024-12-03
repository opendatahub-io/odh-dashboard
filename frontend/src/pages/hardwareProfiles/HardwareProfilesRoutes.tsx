import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import HardwareProfiles from './HardwareProfiles';

const HardwareProfilesRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<HardwareProfiles />} />
    <Route path="*" element={<Navigate to="." />} />
  </Routes>
);

export default HardwareProfilesRoutes;
