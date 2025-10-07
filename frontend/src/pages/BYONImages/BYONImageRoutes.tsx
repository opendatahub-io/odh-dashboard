import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ManageAcceleratorProfile from '#~/pages/acceleratorProfiles/screens/manage/ManageAcceleratorProfile';
import BYONImages from '#~/pages/BYONImages/BYONImages';
import ManageHardwareProfile from '#~/pages/hardwareProfiles/manage/ManageHardwareProfile';
import { buildV2RedirectRoutes } from '#~/utilities/v2Redirect';
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
    <Route
      path="accelerator-profile/create"
      element={
        <ManageAcceleratorProfile
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
