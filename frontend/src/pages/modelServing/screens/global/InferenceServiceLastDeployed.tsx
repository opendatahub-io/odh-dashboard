import * as React from 'react';
import type { InferenceServiceKind } from '@odh-dashboard/model-serving/shared';
import { LastDeployed } from '@odh-dashboard/ui-core/components/LastDeployed';
import { getInferenceServiceStoppedStatus } from '#~/pages/modelServing/utils';

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
