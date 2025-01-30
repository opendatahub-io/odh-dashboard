import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ManageAcceleratorProfile from '~/pages/acceleratorProfiles/screens/manage/ManageAcceleratorProfile';
import BYONImages from '~/pages/BYONImages/BYONImages';
import ManageHardwareProfile from '~/pages/hardwareProfiles/manage/ManageHardwareProfile';

const BYONImageRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<BYONImages />} />
    <Route
      path="/hardwareProfile/create"
      element={
        <ManageHardwareProfile homepageTitle="Notebook images" contextPath="/notebookImages" />
      }
    />
    <Route
      path="/acceleratorProfile/create"
      element={
        <ManageAcceleratorProfile homepageTitle="Notebook images" contextPath="/notebookImages" />
      }
    />
    <Route path="*" element={<Navigate to="." />} />
  </Routes>
);

export default BYONImageRoutes;
