import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import EditAcceleratorProfile from './screens/manage/EditAcceleratorProfile';
import AcceleratorProfiles from './screens/list/AcceleratorProfiles';
import ManageAcceleratorProfile from './screens/manage/ManageAcceleratorProfile';

const AcceleratorProfilesRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<AcceleratorProfiles />} />
    <Route path="/create" element={<ManageAcceleratorProfile />} />
    <Route path="/edit/:acceleratorProfileName" element={<EditAcceleratorProfile />} />
    <Route path="*" element={<Navigate to="." />} />
  </Routes>
);

export default AcceleratorProfilesRoutes;
