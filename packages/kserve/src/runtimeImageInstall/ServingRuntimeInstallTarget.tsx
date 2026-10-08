import React from 'react';
import type { RuntimeImageInstallTargetProps } from '@odh-dashboard/model-serving/extension-points/runtime-image-install-target';

const ServingRuntimeInstallTarget: React.FC<RuntimeImageInstallTargetProps> = ({ targetData }) => (
  // TODO: Replace this stub content with the Serving runtime template form in https://redhat.atlassian.net/browse/RHOAIENG-96639.
  <pre>{JSON.stringify(targetData, null, 2)}</pre>
);

export default ServingRuntimeInstallTarget;
