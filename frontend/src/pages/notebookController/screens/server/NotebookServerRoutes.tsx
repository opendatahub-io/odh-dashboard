import * as React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import NotebookServer from './NotebookServer';
import NotebookControlPanelRedirect from './NotebookControlPanelRedirect';
import SpawnerPage from './SpawnerPage';

const NotebookServerRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<NotebookServer />} />
    <Route path="/spawner" element={<SpawnerPage />} />
    <Route path="/:username/:type" element={<NotebookControlPanelRedirect />} />
    <Route path="*" element={<Navigate to="." replace />} />
  </Routes>
);

export default NotebookServerRoutes;
