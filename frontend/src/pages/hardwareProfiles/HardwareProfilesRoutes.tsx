import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ManageHardwareProfile from '~/pages/hardwareProfiles/manage/ManageHardwareProfile';
import {
  DuplicateHardWareProfile,
  EditHardWareProfile,
} from '~/pages/hardwareProfiles/manage/ManageHardwareProfileWrapper';
import HardwareProfiles from './HardwareProfiles';

const HardwareProfilesRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<HardwareProfiles />} />
    <Route path="/create" element={<ManageHardwareProfile />} />
    <Route path="/edit/:hardwareProfileName" element={<EditHardWareProfile />} />
    <Route path="/duplicate/:hardwareProfileName" element={<DuplicateHardWareProfile />} />
    <Route path="*" element={<Navigate to="." />} />
  </Routes>
);

export default HardwareProfilesRoutes;
