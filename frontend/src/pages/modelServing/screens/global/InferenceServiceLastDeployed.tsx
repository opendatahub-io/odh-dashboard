import * as React from 'react';
import type { InferenceServiceKind } from '@odh-dashboard/model-serving/shared';
import { getInferenceServiceStoppedStatus } from '#~/pages/modelServing/utils';
import { LastDeployed } from '#~/components/LastDeployed.tsx';

type InferenceServiceLastDeployedProps = {
  inferenceService: InferenceServiceKind;
};

const InferenceServiceLastDeployed: React.FC<InferenceServiceLastDeployedProps> = ({
  inferenceService,
}) => {
  const { isStopped } = getInferenceServiceStoppedStatus(inferenceService);

  if (isStopped) {
    return <>-</>;
  }

  return <LastDeployed resource={inferenceService} />;
};

export default InferenceServiceLastDeployed;
