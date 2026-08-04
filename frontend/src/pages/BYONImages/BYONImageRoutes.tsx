import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { buildV2RedirectRoutes } from '@odh-dashboard/plugin-core/routing';
import BYONImages from '#~/pages/BYONImages/BYONImages';
import ManageHardwareProfile from '#~/pages/hardwareProfiles/manage/ManageHardwareProfile';
import { v2RedirectMap } from './v2Redirects';

const BYONImageRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<BYONImages />} />
    <Route
      path="hardware-profile/create"
      element={
        <ManageHardwareProfile
          homepageTitle="Workbench images"
          contextPath="/settings/environment-setup/workbench-images"
        />
      }
    />
    {buildV2RedirectRoutes(v2RedirectMap)}
    <Route path="*" element={<Navigate to="." />} />
  </Routes>
);

export default BYONImageRoutes;
