import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { accessAllowedRouteHoC, verbModelAccess } from '@odh-dashboard/internal/concepts/userSSAR';
import { HardwareProfileModel } from '@odh-dashboard/internal/api';
import ManageHardwareProfile from './manage/ManageHardwareProfile';
import {
  DuplicateHardwareProfile,
  EditHardwareProfile,
} from './manage/ManageHardwareProfileWrapper';
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
