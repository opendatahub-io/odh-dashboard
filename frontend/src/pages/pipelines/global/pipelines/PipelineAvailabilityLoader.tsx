import React from 'react';
import { Outlet } from 'react-router-dom';
import EnsureAPIAvailability from '#~/concepts/pipelines/EnsureAPIAvailability';
import EnsureCompatiblePipelineServer from '#~/concepts/pipelines/EnsureCompatiblePipelineServer';

const PipelineAvailabilityLoader: React.FC = () => (
  <EnsureAPIAvailability>
    <EnsureCompatiblePipelineServer>
      <Outlet />
    </EnsureCompatiblePipelineServer>
  </EnsureAPIAvailability>
);

export default PipelineAvailabilityLoader;
