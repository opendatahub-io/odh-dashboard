import * as React from 'react';
import { Timestamp, TimestampTooltipVariant } from '@patternfly/react-core';
import { InferenceServiceKind } from '#~/k8sTypes';
import { relativeTime } from '#~/utilities/time';
import { getInferenceServiceStoppedStatus, isModelMesh } from '#~/pages/modelServing/utils';

type InferenceServiceLastDeployedProps = {
  inferenceService: InferenceServiceKind;
};

const InferenceServiceLastDeployed: React.FC<InferenceServiceLastDeployedProps> = ({
  inferenceService,
}) => {
  const { isStopped } = getInferenceServiceStoppedStatus(inferenceService);

  if (isStopped || isModelMesh(inferenceService)) {
    return <>-</>;
  }

  const readyCondition = (inferenceService.status?.conditions || []).find(
    (c) => c.type === 'Ready',
  );

  const creationTimestamp =
    readyCondition?.lastTransitionTime ?? inferenceService.metadata.creationTimestamp ?? '';

  return (
    <span style={{ whiteSpace: 'nowrap' }}>
      <Timestamp
        date={new Date(creationTimestamp)}
        tooltip={{
          variant: TimestampTooltipVariant.default,
        }}
      >
        {relativeTime(Date.now(), new Date(creationTimestamp).getTime())}
      </Timestamp>
    </span>
  );
};

export default InferenceServiceLastDeployed;
