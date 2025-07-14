import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ManageHardwareProfile from '#~/pages/hardwareProfiles/manage/ManageHardwareProfile';
import {
  DuplicateHardwareProfile,
  EditHardwareProfile,
} from '#~/pages/hardwareProfiles/manage/ManageHardwareProfileWrapper';
import { accessAllowedRouteHoC, verbModelAccess } from '#~/concepts/userSSAR';
import { HardwareProfileModel } from '#~/api';
import HardwareProfiles from './HardwareProfiles';

const HardwareProfilesRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<HardwareProfiles />} />
    <Route path="/create" element={<ManageHardwareProfile />} />
    <Route path="/edit/:hardwareProfileName" element={<EditHardwareProfile />} />
    <Route path="/duplicate/:hardwareProfileName" element={<DuplicateHardwareProfile />} />
    <Route path="*" element={<Navigate to="." />} />
  </Routes>
);

// TODO: Determine if create is the best value -- RHOAIENG-21129
export default accessAllowedRouteHoC(verbModelAccess('create', HardwareProfileModel))(
  HardwareProfilesRoutes,
);
