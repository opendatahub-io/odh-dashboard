import React from 'react';
import { Timestamp, TimestampTooltipVariant } from '@patternfly/react-core';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { relativeTime } from '@odh-dashboard/internal/utilities/time';
import { Deployment, ModelResourceType } from '../../../extension-points';

type ModelWithStatus = ModelResourceType & {
  status?: { conditions?: { type: string; lastTransitionTime: string }[] };
  metadata: ModelResourceType['metadata'] & K8sResourceCommon['metadata'];
};

type DeploymentLastDeployedProps = {
  deployment: Deployment<ModelWithStatus>;
};

const DeploymentLastDeployed: React.FC<DeploymentLastDeployedProps> = ({
  deployment: {
    model: { metadata, status },
  },
}) => {
  const readyCondition = status?.conditions?.find((c) => c.type === 'Ready');

  const creationTimestamp = readyCondition?.lastTransitionTime ?? metadata.creationTimestamp ?? '';

  if (!creationTimestamp) {
    return <>-</>;
  }

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

export default DeploymentLastDeployed;
