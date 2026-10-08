import React from 'react';
import type { RuntimeImageInstallTargetProps } from '@odh-dashboard/model-serving/extension-points/runtime-image-install-target';

const LlmAcceleratorInstallTarget: React.FC<RuntimeImageInstallTargetProps> = ({ targetData }) => (
  // TODO: Replace this stub content with the LLM accelerator configuration form in https://redhat.atlassian.net/browse/RHOAIENG-96640.
  <pre>{JSON.stringify(targetData, null, 2)}</pre>
);

export default LlmAcceleratorInstallTarget;
